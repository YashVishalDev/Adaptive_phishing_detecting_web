/**
 * TrustLens URL Security Scanner.
 * Evaluates any user-provided URL in real-time using on-device ML,
 * deterministic security rules, brand spoofing detection, and reputation stores.
 */

import { TreeEvaluator, ModelBundle } from "./tree-evaluator";
import { ShapExplainer, FeatureAttribution } from "./shap-explainer";
import { RuleLayer, RuleResult } from "./rule-layer";
import { FusionEngine, Verdict, SensitivityLevel } from "./fusion";
import { ReasonCatalog, PlainReason } from "./reason-catalog";
import { ReputationStore } from "../features/reputation-store";
import { extractAllFeatures, ExtractionContext } from "../features/feature-extractor";
import { parseDomainParts, damerauLevenshteinDistance } from "../features/url-extractor";
import { TOP_BRANDS, SUSPICIOUS_TLDS, URL_SHORTENERS } from "../features/schema";
import bundledModel from "./bundled-model.json";

export interface UrlScanSignals {
  isHttps: boolean;
  isTrancoTop: boolean;
  isBloomBad: boolean;
  isIpHost: boolean;
  suspiciousTld: boolean;
  hasPunycode: boolean;
  entropyDomain: number;
  minTyposquatDist: number;
  matchedBrand?: string;
  hasAtSymbol: boolean;
  portAnomaly: boolean;
  port?: number | null;
  isKnownShortener: boolean;
  brandInSubdomain: boolean;
  brandInPath: boolean;
  subdomainCount: number;
}

export interface UrlScanReport {
  rawInput: string;
  normalizedUrl: string;
  hostname: string;
  apexDomain: string;
  domainName: string;
  tld: string;
  subdomains: string[];
  trustScore: number;
  verdict: Verdict;
  phishProbability: number;
  reasons: PlainReason[];
  attributions: FeatureAttribution[];
  signals: UrlScanSignals;
  scannedAt: number;
  isUserOverridden?: boolean;
}

export class UrlScanner {
  private evaluator: TreeEvaluator;
  private explainer: ShapExplainer;
  private reputationStore: ReputationStore;

  constructor(reputationStore?: ReputationStore) {
    const model = bundledModel as ModelBundle;
    this.evaluator = new TreeEvaluator(model);
    this.explainer = new ShapExplainer(model);
    this.reputationStore = reputationStore || new ReputationStore();
  }

  public getReputationStore(): ReputationStore {
    return this.reputationStore;
  }

  public scan(
    input: string,
    sensitivity: SensitivityLevel = "balanced"
  ): UrlScanReport {
    let cleanInput = input.trim();
    if (!cleanInput) {
      throw new Error("Please enter a valid URL to analyze.");
    }

    // Auto-prepend protocol if missing
    let normalizedUrl = cleanInput;
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = "https://" + normalizedUrl;
    }

    let parsed: URL;
    try {
      parsed = new URL(normalizedUrl);
    } catch {
      // Fallback formatting
      parsed = new URL("http://" + cleanInput);
      normalizedUrl = parsed.toString();
    }

    const hostname = parsed.hostname.toLowerCase();
    const { apexDomain, domainName, tld, subdomains } = parseDomainParts(hostname);
    const port = parsed.port ? parseInt(parsed.port, 10) : null;
    const isHttps = parsed.protocol === "https:";

    // Check user manual override
    const userTrust = this.reputationStore.getUserTrustStatus(hostname);
    if (userTrust === 1) {
      return {
        rawInput: input,
        normalizedUrl,
        hostname,
        apexDomain,
        domainName,
        tld,
        subdomains,
        trustScore: 100,
        verdict: "Safe",
        phishProbability: 0.0,
        reasons: [
          {
            id: "USER_TRUSTED_OVERRIDE",
            title: "Explicitly Trusted by You",
            plainText: `The domain "${hostname}" is explicitly in your personal trusted list.`,
            evidence: "User whitelist entry active.",
            whyItMatters: "Manual user trust overrides automatic heuristic scoring.",
            severity: "info"
          }
        ],
        attributions: [],
        signals: this.gatherSignals(parsed, apexDomain, domainName, tld, subdomains, isHttps),
        scannedAt: Date.now(),
        isUserOverridden: true
      };
    } else if (userTrust === -1) {
      return {
        rawInput: input,
        normalizedUrl,
        hostname,
        apexDomain,
        domainName,
        tld,
        subdomains,
        trustScore: 0,
        verdict: "Dangerous",
        phishProbability: 1.0,
        reasons: [
          {
            id: "USER_BLOCKED_OVERRIDE",
            title: "Explicitly Blocked by You",
            plainText: `The domain "${hostname}" is explicitly in your personal blocked list.`,
            evidence: "User denylist entry active.",
            whyItMatters: "Manual user block forces zero trust score.",
            severity: "critical"
          }
        ],
        attributions: [],
        signals: this.gatherSignals(parsed, apexDomain, domainName, tld, subdomains, isHttps),
        scannedAt: Date.now(),
        isUserOverridden: true
      };
    }

    // Context from reputation store
    const isTranco = this.reputationStore.isTrancoTop10k(hostname);
    const isBloomBad = this.reputationStore.isBloomBadHit(hostname);

    const context: ExtractionContext = {
      redirect_hop_count: 0,
      redirect_cross_domain: false,
      protocol_downgraded: false,
      has_mixed_content: false,
      tls_validity_days: isHttps ? 90 : -1,
      is_tranco_top_10k: isTranco,
      is_bloom_bad_hit: isBloomBad
    };

    // Extract 44-dimensional feature vector
    const features = extractAllFeatures(normalizedUrl, null, context);

    // Predict ML probability
    const { probability } = this.evaluator.predict(features);

    // Deterministic rules
    const rules = RuleLayer.evaluate(features, normalizedUrl);

    // Fusion score & verdict
    const fusion = FusionEngine.compute(probability, rules, sensitivity);

    // SHAP attributions
    const attributions = this.explainer.explain(features);

    // Plain-language reasons
    const reasons = ReasonCatalog.explain(
      fusion.verdict,
      attributions,
      rules,
      features,
      normalizedUrl
    );

    const signals = this.gatherSignals(parsed, apexDomain, domainName, tld, subdomains, isHttps);

    return {
      rawInput: input,
      normalizedUrl,
      hostname,
      apexDomain,
      domainName,
      tld,
      subdomains,
      trustScore: fusion.trustScore,
      verdict: fusion.verdict,
      phishProbability: Number(Math.max(fusion.calibratedPhishProbability, (100 - fusion.trustScore) / 100).toFixed(4)),
      reasons,
      attributions,
      signals,
      scannedAt: Date.now()
    };
  }

  private gatherSignals(
    parsed: URL,
    apexDomain: string,
    domainName: string,
    tld: string,
    subdomains: string[],
    isHttps: boolean
  ): UrlScanSignals {
    const hostname = parsed.hostname.toLowerCase();
    const port = parsed.port ? parseInt(parsed.port, 10) : null;
    const urlStr = parsed.toString();
    const pathLower = (parsed.pathname || "").toLowerCase();
    const subdomainStr = subdomains.join(".").toLowerCase();

    const ipv4Regex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    const isIpHost = ipv4Regex.test(hostname) || (hostname.includes(":") && !port);
    const hasPunycode = hostname.includes("xn--") || [...hostname].some(c => c.charCodeAt(0) > 127);
    const suspiciousTld = SUSPICIOUS_TLDS.has(tld.toLowerCase());
    const isKnownShortener = URL_SHORTENERS.has(apexDomain) || URL_SHORTENERS.has(hostname);
    const portAnomaly = port !== null && port !== 80 && port !== 443;
    const hasAtSymbol = urlStr.includes("@");

    // Entropy calculation
    const entropyDomain = this.calcEntropy(domainName || hostname);

    let minTyposquatDist = 10;
    let matchedBrand: string | undefined = undefined;
    let brandInSubdomain = false;
    let brandInPath = false;

    const domainTokens = domainName ? domainName.split(/[-_.]/) : [];

    for (const brand of TOP_BRANDS) {
      if (subdomainStr.includes(brand)) {
        brandInSubdomain = true;
        if (!matchedBrand) matchedBrand = brand;
      }
      if (pathLower.includes(brand) && !apexDomain.includes(brand)) {
        brandInPath = true;
        if (!matchedBrand) matchedBrand = brand;
      }
      if (domainName) {
        const dist = damerauLevenshteinDistance(domainName, brand);
        if (dist < minTyposquatDist) {
          minTyposquatDist = dist;
          if (dist <= 2) matchedBrand = brand;
        }

        // Check compound domain tokens (e.g. amaz0n-security -> amaz0n vs amazon)
        for (const tok of domainTokens) {
          if (tok.length >= 3) {
            const tokDist = damerauLevenshteinDistance(tok, brand);
            if (tokDist < minTyposquatDist) {
              minTyposquatDist = tokDist;
              if (tokDist <= 2) matchedBrand = brand;
            }
          }
        }
      }
    }

    return {
      isHttps,
      isTrancoTop: this.reputationStore.isTrancoTop10k(hostname),
      isBloomBad: this.reputationStore.isBloomBadHit(hostname),
      isIpHost,
      suspiciousTld,
      hasPunycode,
      entropyDomain,
      minTyposquatDist,
      matchedBrand,
      hasAtSymbol,
      portAnomaly,
      port,
      isKnownShortener,
      brandInSubdomain,
      brandInPath,
      subdomainCount: subdomains.length
    };
  }

  private calcEntropy(s: string): number {
    if (!s) return 0;
    const len = s.length;
    const freq: Record<string, number> = {};
    for (const ch of s) freq[ch] = (freq[ch] || 0) + 1;
    let ent = 0;
    for (const count of Object.values(freq)) {
      const p = count / len;
      ent -= p * Math.log2(p);
    }
    return Number(ent.toFixed(3));
  }
}
