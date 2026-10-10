/**
 * TrustLens Scoring Orchestrator.
 * Coordinates multi-stage evaluation (Navigation -> DOM -> Mutation),
 * badge status updates, session caching, and full audit report generation.
 */

import { TreeEvaluator, ModelBundle } from "../engine/tree-evaluator";
import { ShapExplainer, FeatureAttribution } from "../engine/shap-explainer";
import { RuleLayer, RuleResult } from "../engine/rule-layer";
import { FusionEngine, Verdict, SensitivityLevel } from "../engine/fusion";
import { ReasonCatalog, PlainReason } from "../engine/reason-catalog";
import { ReputationStore, extractCleanDomain } from "../features/reputation-store";
import { extractAllFeatures, ExtractionContext } from "../features/feature-extractor";
import { MV3BasicTLSProvider, TLSSignalProvider } from "../features/tls-provider";
import { NavigationTracker } from "./navigation-tracker";
import bundledModel from "../engine/bundled-model.json";

export interface PageAuditReport {
  url: string;
  tabId: number;
  timestamp: number;
  stage: 1 | 2 | 3;
  trustScore: number;
  verdict: Verdict;
  phishProbability: number;
  reasons: PlainReason[];
  attributions: FeatureAttribution[];
  features: number[];
  modelVersion: string;
  isUserOverridden?: boolean;
}

export class ScoringOrchestrator {
  private evaluator: TreeEvaluator;
  private explainer: ShapExplainer;
  private reputationStore: ReputationStore;
  private tlsProvider: TLSSignalProvider;
  private navTracker: NavigationTracker;
  private cache: Map<number, PageAuditReport> = new Map();
  private sensitivity: SensitivityLevel = "balanced";

  constructor(navTracker: NavigationTracker) {
    const model = bundledModel as ModelBundle;
    this.evaluator = new TreeEvaluator(model);
    this.explainer = new ShapExplainer(model);
    this.reputationStore = new ReputationStore();
    this.tlsProvider = new MV3BasicTLSProvider();
    this.navTracker = navTracker;
  }

  public getReputationStore(): ReputationStore {
    return this.reputationStore;
  }

  public setSensitivity(level: SensitivityLevel): void {
    this.sensitivity = level;
  }

  public getSensitivity(): SensitivityLevel {
    return this.sensitivity;
  }

  public async evaluatePage(
    tabId: number,
    url: string,
    htmlContent: string | null = null,
    stage: 1 | 2 | 3 = 1
  ): Promise<PageAuditReport> {
    await this.reputationStore.whenReady();

    let hostname = "";
    try {
      hostname = new URL(url).hostname;
    } catch {
      hostname = extractCleanDomain(url);
    }

    // 1. Check user manual override first
    const userTrust = this.reputationStore.getUserTrustStatus(hostname);
    if (userTrust === 1) {
      // User explicitly whitelisted
      const report: PageAuditReport = {
        url,
        tabId,
        timestamp: Date.now(),
        stage,
        trustScore: 100,
        verdict: "Safe",
        phishProbability: 0.0,
        reasons: [{
          id: "USER_TRUSTED_OVERRIDE",
          title: "Explicitly Trusted Site",
          plainText: "You have marked this website as trusted in your personal settings.",
          evidence: "User whitelist entry active.",
          whyItMatters: "Manual user trust overrides automatic heuristic scoring.",
          severity: "info"
        }],
        attributions: [],
        features: Array(44).fill(0),
        modelVersion: bundledModel.model_version,
        isUserOverridden: true
      };
      this.cache.set(tabId, report);
      this.updateBadge(tabId, report);
      return report;
    } else if (userTrust === -1) {
      // User explicitly blocked
      const report: PageAuditReport = {
        url,
        tabId,
        timestamp: Date.now(),
        stage,
        trustScore: 0,
        verdict: "Dangerous",
        phishProbability: 1.0,
        reasons: [{
          id: "USER_BLOCKED_OVERRIDE",
          title: "Website Blocked by You",
          plainText: `The domain "${hostname}" is on your personal blocked sites list. Navigation has been prevented.`,
          evidence: "User blocklist rule active in TrustLens settings.",
          whyItMatters: "Manual domain block halts page loading and enforces zero trust score.",
          severity: "critical"
        }],
        attributions: [],
        features: Array(44).fill(0),
        modelVersion: bundledModel.model_version,
        isUserOverridden: true
      };
      this.cache.set(tabId, report);
      this.updateBadge(tabId, report);
      return report;
    }

    // 2. Build extraction context
    const navCtx = this.navTracker.getContext(tabId);
    const tlsSignals = await this.tlsProvider.getSignals(url, tabId);
    const isTranco = this.reputationStore.isTrancoTop10k(hostname);
    const isBloomBad = this.reputationStore.isBloomBadHit(hostname);

    const context: ExtractionContext = {
      redirect_hop_count: navCtx?.hopCount || 0,
      redirect_cross_domain: navCtx?.crossDomain || false,
      protocol_downgraded: navCtx?.protocolDowngraded || false,
      has_mixed_content: tlsSignals.hasMixedContent,
      tls_validity_days: tlsSignals.validityDays,
      is_tranco_top_10k: isTranco,
      is_bloom_bad_hit: isBloomBad
    };

    // 3. Extract 44-dimensional feature vector
    const features = extractAllFeatures(url, htmlContent, context);

    // 4. ML Model Inference & Isotonic Calibration
    const { probability } = this.evaluator.predict(features);

    // 5. Deterministic Rule Layer
    const rules = RuleLayer.evaluate(features, url);

    // 6. Fusion Trust Score & Verdict
    const fusion = FusionEngine.compute(probability, rules, this.sensitivity);

    // 7. TreeSHAP Explanation Attributions
    const attributions = this.explainer.explain(features);

    // 8. Plain-Language Reason Catalog
    const reasons = ReasonCatalog.explain(
      fusion.verdict,
      attributions,
      rules,
      features,
      url
    );

    const report: PageAuditReport = {
      url,
      tabId,
      timestamp: Date.now(),
      stage,
      trustScore: fusion.trustScore,
      verdict: fusion.verdict,
      phishProbability: fusion.calibratedPhishProbability,
      reasons,
      attributions,
      features,
      modelVersion: bundledModel.model_version
    };

    this.cache.set(tabId, report);
    this.updateBadge(tabId, report);

    return report;
  }

  public getCachedReport(tabId: number): PageAuditReport | undefined {
    return this.cache.get(tabId);
  }

  private updateBadge(tabId: number, report: PageAuditReport): void {
    if (typeof chrome === "undefined" || !chrome.action) return;

    let text = `${report.trustScore}`;
    let color = "#10B981"; // Safe green

    switch (report.verdict) {
      case "Safe":
        color = "#10B981";
        break;
      case "Caution":
        color = "#F59E0B"; // Amber
        break;
      case "Suspicious":
        color = "#F97316"; // Orange
        break;
      case "Dangerous":
        color = "#EF4444"; // Red
        text = "!";
        break;
    }

    try {
      chrome.action.setBadgeText({ tabId, text });
      chrome.action.setBadgeBackgroundColor({ tabId, color });
    } catch {}
  }
}
