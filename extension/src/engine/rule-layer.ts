/**
 * High-Precision Deterministic Rule Layer for TrustLens.
 * Hard security rules that take immediate precedence or apply heavy penalties.
 */

export interface RuleResult {
  ruleId: string;
  name: string;
  triggered: boolean;
  severity: "critical" | "warning" | "safe";
  penaltyMultiplier: number; // 0.0 means immediate Dangerous, 1.0 means no penalty
  plainReason: string;
  evidence: string;
  whyItMatters: string;
}

export class RuleLayer {
  /**
   * Evaluates deterministic rules against the 44-dimensional feature vector and context.
   */
  public static evaluate(features: number[], currentUrl: string): RuleResult[] {
    const results: RuleResult[] = [];

    // Indices from FEATURE_NAME_TO_INDEX:
    // 3: is_ip_host
    // 4: has_punycode
    // 10: suspicious_tld
    // 12: port_anomaly
    // 13: brand_in_subdomain
    // 14: brand_in_path
    // 15: min_typosquat_dist
    // 16: has_password_input
    // 24: favicon_origin_mismatch
    // 25: title_brand_mismatch
    // 30: obfuscated_js_detected
    // 31: form_action_cross_origin
    // 32: form_action_insecure
    // 34: credential_cross_post
    // 35: sensitive_combo_detected
    // 42: is_tranco_top_10k
    // 43: is_bloom_bad_hit

    const isIpHost = features[3] === 1.0;
    const hasPunycode = features[4] === 1.0;
    const portAnomaly = features[12] === 1.0;
    const brandInSubdomain = features[13] === 1.0;
    const minTyposquatDist = features[15];
    const hasPassword = features[16] === 1.0;
    const titleBrandMismatch = features[25] === 1.0;
    const obfuscatedJs = features[30] === 1.0;
    const formCross = features[31] === 1.0;
    const formInsecure = features[32] === 1.0;
    const credCrossPost = features[34] === 1.0;
    const sensitiveCombo = features[35] === 1.0;
    const isTrancoTop10k = features[42] === 1.0;
    const isBloomBad = features[43] === 1.0;

    // RULE 1: Known Bad Threat Hit in Local Bloom Filter
    if (isBloomBad) {
      results.push({
        ruleId: "RULE_BLOOM_BAD_HIT",
        name: "Known Active Threat Match",
        triggered: true,
        severity: "critical",
        penaltyMultiplier: 0.0, // Instant Dangerous
        plainReason: "This website matches a known active phishing threat database.",
        evidence: `Domain flagged in verified blocklist: ${currentUrl}`,
        whyItMatters: "Verified malicious sites must be blocked immediately to protect your credentials."
      });
    }

    // RULE 2: Password Cross-Posting to Disparate Apex Domain
    if (credCrossPost || (hasPassword && formCross)) {
      results.push({
        ruleId: "RULE_CREDENTIAL_CROSS_POST",
        name: "Password Submits to Foreign Domain",
        triggered: true,
        severity: "critical",
        penaltyMultiplier: 0.0, // Instant Dangerous
        plainReason: "This page requests your password, but sends it to a different unverified website.",
        evidence: "Password form action points to an external destination.",
        whyItMatters: "Legitimate organizations process credentials on their own domain. Third-party form destinations indicate credential exfiltration."
      });
    }

    // RULE 3: Extreme Identity Harvesting Combination (Password + Card + SSN)
    if (sensitiveCombo) {
      results.push({
        ruleId: "RULE_SENSITIVE_IDENTITY_COMBO",
        name: "Anomalous Personal Identity Request",
        triggered: true,
        severity: "critical",
        penaltyMultiplier: 0.05,
        plainReason: "This form asks for a dangerous combination of password, payment card, and government ID.",
        evidence: "Simultaneous collection of password, credit card, and national ID.",
        whyItMatters: "Phishing kits frequently harvest full identity packages on single deceptive pages."
      });
    }

    // RULE 4: Punycode Homoglyph Look-Alike
    if (hasPunycode && (hasPassword || brandInSubdomain || minTyposquatDist <= 2)) {
      results.push({
        ruleId: "RULE_HOMOGLYPH_DECEPTION",
        name: "Deceptive Character Imitation (Punycode)",
        triggered: true,
        severity: "critical",
        penaltyMultiplier: 0.1,
        plainReason: "The domain name uses foreign look-alike alphabet characters to impersonate a familiar brand.",
        evidence: "Punycode (xn--) encoding detected on authentication page.",
        whyItMatters: "Attackers register visually identical Cyrillic or Greek domain names to trick visitors into typing passwords."
      });
    }

    // RULE 5: Brand Spoofed in Subdomain on Unrelated Domain
    if (brandInSubdomain && hasPassword && !isTrancoTop10k) {
      results.push({
        ruleId: "RULE_SUBDOMAIN_BRAND_SPOOF",
        name: "Brand Keyword Deception in Subdomain",
        triggered: true,
        severity: "warning",
        penaltyMultiplier: 0.25,
        plainReason: "A trusted brand name appears in the subdomain, but the actual hosting domain is unrelated.",
        evidence: "Trusted brand name placed in subdomain before an unfamiliar apex.",
        whyItMatters: "Attackers create subdomains like 'paypal.com.attacker-server.net' to make the address bar look authentic."
      });
    }

    // RULE 6: Insecure Form Submission over Plain HTTP
    if (formInsecure && hasPassword) {
      results.push({
        ruleId: "RULE_INSECURE_PASSWORD_TRANSMISSION",
        name: "Unencrypted Password Submission",
        triggered: true,
        severity: "critical",
        penaltyMultiplier: 0.1,
        plainReason: "Your password would be transmitted over an unencrypted, insecure HTTP connection.",
        evidence: "Form action targets plain http:// endpoint from https:// page.",
        whyItMatters: "Any attacker on the local network or Wi-Fi can intercept passwords sent over unencrypted connections."
      });
    }

    // RULE 7: IP Address Host on Non-Standard Port with Login
    if (isIpHost && (portAnomaly || hasPassword)) {
      results.push({
        ruleId: "RULE_IP_HOST_AUTH",
        name: "Raw IP Address Hosting Authentication",
        triggered: true,
        severity: "critical",
        penaltyMultiplier: 0.15,
        plainReason: "This website uses a raw numerical IP address instead of an authenticated domain name.",
        evidence: `Raw IP address host with login elements: ${currentUrl}`,
        whyItMatters: "Legitimate businesses use verified registered domain names with TLS certificates, not raw IP addresses."
      });
    }

    // RULE 8: Cloned Brand Visual Identity
    if (titleBrandMismatch && hasPassword && !isTrancoTop10k) {
      results.push({
        ruleId: "RULE_CLONED_BRAND_IDENTITY",
        name: "Cloned Brand Title Mismatch",
        triggered: true,
        severity: "warning",
        penaltyMultiplier: 0.35,
        plainReason: "The page title claims to be a recognized brand, but the site domain is completely unaffiliated.",
        evidence: "Page title references brand identity disparate from apex domain.",
        whyItMatters: "Phishing kits copy the visual design and title of popular sites onto attacker-owned domains."
      });
    }

    // RULE 9: Obfuscated Anti-Analysis Scripts on Login Page
    if (obfuscatedJs && hasPassword) {
      results.push({
        ruleId: "RULE_OBFUSCATED_ANTI_ANALYSIS",
        name: "Obfuscated Anti-Analysis Code Detected",
        triggered: true,
        severity: "warning",
        penaltyMultiplier: 0.4,
        plainReason: "This page contains heavily encoded and obfuscated scripts designed to hide from security scanners.",
        evidence: "Repeated eval/unescape/atob patterns detected alongside password form.",
        whyItMatters: "Phishing kits use JavaScript obfuscators to evade security filters and antivirus tools."
      });
    }

    // RULE 10: High-Reputation Tranco Top-10k Apex Fast-Path
    if (isTrancoTop10k && !credCrossPost && !sensitiveCombo && !isIpHost && !hasPunycode) {
      results.push({
        ruleId: "RULE_TRANCO_TOP_REPUTATION",
        name: "Verified Global Top Domain",
        triggered: true,
        severity: "safe",
        penaltyMultiplier: 1.0,
        plainReason: "This website is an established, high-reputation domain verified in global top traffic rankings.",
        evidence: "Domain verified in Tranco top reputation index.",
        whyItMatters: "Globally recognized domains with consistent cryptographic security pose minimal baseline phishing risk."
      });
    }

    // RULE 11: Delimiter @ Userinfo Trap on Auth Page
    const hasAtSymbol = features[8] === 1.0;
    if (hasAtSymbol && (hasPassword || !isTrancoTop10k)) {
      results.push({
        ruleId: "RULE_AT_SYMBOL_CREDENTIAL_TRAP",
        name: "Deceptive Userinfo Delimiter (@) Trick",
        triggered: true,
        severity: "critical",
        penaltyMultiplier: 0.05,
        plainReason: "The address bar uses an '@' character to visually spoof a brand while directing traffic to an attacker site.",
        evidence: `Deceptive '@' authority delimiter present in ${currentUrl}`,
        whyItMatters: "Standard browser URI parsing routes to the server after '@', ignoring the fake domain in front."
      });
    }

    // RULE 12: Double-Slash Open Redirection Sequence
    const doubleSlashRedirect = features[9] === 1.0;
    if (doubleSlashRedirect && hasPassword) {
      results.push({
        ruleId: "RULE_DOUBLE_SLASH_REDIRECT",
        name: "Double-Slash Protocol Redirection",
        triggered: true,
        severity: "critical",
        penaltyMultiplier: 0.1,
        plainReason: "The URL path contains '//' sequences commonly abused for open URL redirections to malicious drop servers.",
        evidence: `Open redirect sequence detected in path: ${currentUrl}`,
        whyItMatters: "Attackers leverage open redirects on trusted portals to forward visitors to credential harvest pages."
      });
    }

    // RULE 13: Suspicious TLD with Login Form
    const suspiciousTld = features[10] === 1.0;
    if (suspiciousTld && hasPassword && !isTrancoTop10k) {
      results.push({
        ruleId: "RULE_SUSPICIOUS_TLD_AUTH",
        name: "High-Abuse Suffix with Authentication Form",
        triggered: true,
        severity: "warning",
        penaltyMultiplier: 0.35,
        plainReason: "A login form is hosted on a high-abuse top-level domain frequently associated with disposable phishing kits.",
        evidence: `High-risk registrar extension hosting password input.`,
        whyItMatters: "Disposable domains with minimal registration verification are heavily exploited for phishing."
      });
    }

    // RULE 14: Iframe-Nested Credential Harvesting Trap
    const iframeCount = features[20];
    if (iframeCount > 0 && hasPassword && !isTrancoTop10k) {
      results.push({
        ruleId: "RULE_IFRAME_CREDENTIAL_TRAP",
        name: "Embedded Iframe Authentication Trap",
        triggered: true,
        severity: "warning",
        penaltyMultiplier: 0.35,
        plainReason: "Login credentials are requested inside or alongside embedded iframe windows.",
        evidence: `Document contains ${iframeCount} embedded iframe elements with credential inputs.`,
        whyItMatters: "Attackers embed legitimate background pages within iframes to confuse visitors and conceal fake login boxes."
      });
    }

    return results;
  }
}
