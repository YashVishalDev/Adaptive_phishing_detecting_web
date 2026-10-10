/**
 * Plain-Language Reason Catalog for TrustLens.
 * Maps TreeSHAP feature attributions and rule hits into clear, evidence-backed explanations.
 */

import { FeatureAttribution } from "./shap-explainer";
import { RuleResult } from "./rule-layer";
import { Verdict } from "./fusion";

export interface PlainReason {
  id: string;
  title: string;
  plainText: string;
  evidence: string;
  whyItMatters: string;
  severity: "critical" | "warning" | "info";
  contributionWeight?: number;
}

export class ReasonCatalog {
  /**
   * Generates at least 2 clear, evidence-backed reasons for any non-Safe verdict.
   */
  public static explain(
    verdict: Verdict,
    attributions: FeatureAttribution[],
    rules: RuleResult[],
    features: number[],
    currentUrl: string
  ): PlainReason[] {
    const reasons: PlainReason[] = [];
    const seenIds = new Set<string>();

    // 1. Add active Rule hits first (deterministic evidence)
    for (const rule of rules) {
      if (rule.triggered && rule.severity !== "safe") {
        if (!seenIds.has(rule.ruleId)) {
          seenIds.add(rule.ruleId);
          reasons.push({
            id: rule.ruleId,
            title: rule.name,
            plainText: rule.plainReason,
            evidence: rule.evidence,
            whyItMatters: rule.whyItMatters,
            severity: rule.severity,
            contributionWeight: 1.0
          });
        }
      }
    }

    // 2. Map top positive SHAP attributions (features pushing toward Phishing)
    const topPositiveShap = attributions.filter(a => a.shapValue > 0.05);

    for (const attr of topPositiveShap) {
      if (reasons.length >= 4) break; // Cap at 4 most important reasons for UI clarity

      const mapping = this.mapFeatureToReason(attr, features, currentUrl);
      if (mapping && !seenIds.has(mapping.id)) {
        seenIds.add(mapping.id);
        reasons.push(mapping);
      }
    }

    // 3. Fallback guarantee: Ensure at least 2 plain-language reasons for non-Safe verdicts
    if (verdict !== "Safe" && reasons.length < 2) {
      if (!seenIds.has("SUSPICIOUS_UNVERIFIED_DOMAIN")) {
        reasons.push({
          id: "SUSPICIOUS_UNVERIFIED_DOMAIN",
          title: "Unverified Domain Authority",
          plainText: "This website is newly observed or not recognized among verified top global domains.",
          evidence: `Domain not present in verified trust registries: ${currentUrl}`,
          whyItMatters: "Legitimate organizations register domains that build reputation over years. Phishing campaigns rely on new, disposable domains.",
          severity: "warning",
          contributionWeight: 0.5
        });
      }
    }

    if (verdict === "Dangerous" && reasons.length < 2) {
      if (!seenIds.has("ANOMALOUS_PAGE_STRUCTURE")) {
        reasons.push({
          id: "ANOMALOUS_PAGE_STRUCTURE",
          title: "Anomalous Security Profile",
          plainText: "Multiple structural markers across the page content and URL architecture deviate from secure web standards.",
          evidence: "Aggregate risk metrics triggered multiple statistical anomaly thresholds.",
          whyItMatters: "Phishing engines identify subtle technical discrepancies that human eyes often overlook.",
          severity: "critical",
          contributionWeight: 0.6
        });
      }
    }

    return reasons;
  }

  private static mapFeatureToReason(
    attr: FeatureAttribution,
    features: number[],
    currentUrl: string
  ): PlainReason | null {
    const fName = attr.featureName;
    const val = attr.featureValue;

    switch (fName) {
      case "credential_cross_post":
      case "form_action_cross_origin":
        return {
          id: "SHAP_CRED_CROSS_POST",
          title: "Cross-Origin Form Submission",
          plainText: "This page contains a form that submits data to a different website address than the one you are visiting.",
          evidence: "Form action attribute points to external origin.",
          whyItMatters: "Submitting forms across disparate domains is a primary indicator of data harvesting.",
          severity: "critical",
          contributionWeight: attr.shapValue
        };

      case "has_punycode":
        return {
          id: "SHAP_PUNYCODE",
          title: "Look-Alike Character Spoofing",
          plainText: "The address uses look-alike characters (Punycode / IDN) to impersonate another brand.",
          evidence: `Internationalized domain representation: ${currentUrl}`,
          whyItMatters: "Visual homoglyphs make fraudulent domains look identical to genuine sites.",
          severity: "critical",
          contributionWeight: attr.shapValue
        };

      case "suspicious_tld":
        return {
          id: "SHAP_SUSPICIOUS_TLD",
          title: "High-Abuse Domain Extension",
          plainText: "The website domain ends in a top-level extension frequently associated with disposable phishing campaigns.",
          evidence: `Domain suffix matches high-risk registry list.`,
          whyItMatters: "Certain domain extensions provide cheap, anonymous registrations heavily exploited by fraudsters.",
          severity: "warning",
          contributionWeight: attr.shapValue
        };

      case "brand_in_subdomain":
        return {
          id: "SHAP_BRAND_IN_SUBDOMAIN",
          title: "Deceptive Brand in Subdomain",
          plainText: "A recognizable brand name is placed inside a subdomain to create a false impression of authenticity.",
          evidence: `Brand name placed before unfamiliar apex domain in ${currentUrl}`,
          whyItMatters: "Attackers use subdomains to distract visitors from the real root website name.",
          severity: "warning",
          contributionWeight: attr.shapValue
        };

      case "is_ip_host":
        return {
          id: "SHAP_IP_HOST",
          title: "Numerical IP Address Address",
          plainText: "You are connecting directly to a raw numerical IP address rather than a verified named website.",
          evidence: `Host is an IP address: ${currentUrl}`,
          whyItMatters: "Legitimate corporate and banking websites use verified domain names with SSL certificates.",
          severity: "critical",
          contributionWeight: attr.shapValue
        };

      case "entropy_domain":
        return {
          id: "SHAP_ENTROPY",
          title: "Randomized Domain Pattern",
          plainText: "The domain name consists of unusual character randomness, typical of automated domain generation algorithms (DGAs).",
          evidence: `High character entropy: ${val.toFixed(2)} bits/char`,
          whyItMatters: "Randomized domains are generated in bulk by attackers to evade static blocklists.",
          severity: "warning",
          contributionWeight: attr.shapValue
        };

      case "title_brand_mismatch":
      case "favicon_origin_mismatch":
        return {
          id: "SHAP_CLONED_IDENTITY",
          title: "Brand Asset Mismatch",
          plainText: "The page branding or title references an established company, but is hosted on an unverified third-party server.",
          evidence: "Visual assets hotlinked from official brand while hosting on third party.",
          whyItMatters: "Phishing kits copy logos and titles from legitimate websites to look genuine.",
          severity: "warning",
          contributionWeight: attr.shapValue
        };

      case "redirect_hop_count":
      case "redirect_cross_domain":
        return {
          id: "SHAP_REDIRECT_HOPS",
          title: "Multi-Hop Domain Redirection",
          plainText: "You arrived at this page through multiple automatic hops across different websites.",
          evidence: `Redirection traversed across multiple hops.`,
          whyItMatters: "Multi-hop chains are commonly used to bypass email security scanners before landing on the attack page.",
          severity: "warning",
          contributionWeight: attr.shapValue
        };

      case "context_menu_disabled":
      case "obfuscated_js_detected":
        return {
          id: "SHAP_ANTI_ANALYSIS",
          title: "Anti-Inspection Code Present",
          plainText: "This website actively tries to block right-clicks and inspect element tools.",
          evidence: "Page scripts detect and suppress developer inspection and right-click.",
          whyItMatters: "Malicious kits try to prevent users and security analysts from inspecting their code.",
          severity: "warning",
          contributionWeight: attr.shapValue
        };

      case "empty_anchor_ratio":
        return {
          id: "SHAP_EMPTY_ANCHORS",
          title: "Incomplete / Broken Page Links",
          plainText: "Many links on this page are empty placeholders (pointing to '#' or dead scripts) rather than real pages.",
          evidence: `${(val * 100).toFixed(0)}% of links on page are dead or placeholder anchors.`,
          whyItMatters: "Phish kits replicate the front page of a service but don't bother wiring up secondary links.",
          severity: "info",
          contributionWeight: attr.shapValue
        };

      default:
        return null;
    }
  }
}
