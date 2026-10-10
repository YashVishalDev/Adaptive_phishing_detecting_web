/**
 * TrustLens Canonical Feature Schema in TypeScript.
 * Mirrors Python ml/src/features/schema.py exactly.
 */

export interface FeatureDefinition {
  name: string;
  type: "int" | "float" | "binary";
  default: number;
  stage: 1 | 2;
  desc: string;
}

export const FEATURE_DEFINITIONS: FeatureDefinition[] = [
  // Stage 1: URL Structure Features (0-15)
  { name: "url_length", type: "int", default: 0, stage: 1, desc: "Total character length of URL" },
  { name: "domain_length", type: "int", default: 0, stage: 1, desc: "Length of hostname/domain" },
  { name: "subdomain_count", type: "int", default: 0, stage: 1, desc: "Number of subdomain labels" },
  { name: "is_ip_host", type: "binary", default: 0, stage: 1, desc: "Hostname is an IP address" },
  { name: "has_punycode", type: "binary", default: 0, stage: 1, desc: "Host contains punycode or homoglyphs" },
  { name: "entropy_domain", type: "float", default: 0.0, stage: 1, desc: "Shannon entropy of domain string" },
  { name: "digit_ratio_url", type: "float", default: 0.0, stage: 1, desc: "Ratio of digits to URL length" },
  { name: "special_char_count", type: "int", default: 0, stage: 1, desc: "Count of @, //, -, _, =, %" },
  { name: "has_at_symbol", type: "binary", default: 0, stage: 1, desc: "URL contains @ userinfo delimiter" },
  { name: "double_slash_redirect", type: "binary", default: 0, stage: 1, desc: "URL path contains // open redirect" },
  { name: "suspicious_tld", type: "binary", default: 0, stage: 1, desc: "TLD is in high-abuse list" },
  { name: "is_known_shortener", type: "binary", default: 0, stage: 1, desc: "Domain is a known shortener" },
  { name: "port_anomaly", type: "binary", default: 0, stage: 1, desc: "Non-standard port specified" },
  { name: "brand_in_subdomain", type: "binary", default: 0, stage: 1, desc: "Brand keyword in subdomain" },
  { name: "brand_in_path", type: "binary", default: 0, stage: 1, desc: "Brand keyword in path" },
  { name: "min_typosquat_dist", type: "int", default: 10, stage: 1, desc: "Min Levenshtein dist to top brands" },

  // Stage 2: DOM & Content Features (16-30)
  { name: "has_password_input", type: "binary", default: -1, stage: 2, desc: "Page contains password input" },
  { name: "has_email_input", type: "binary", default: -1, stage: 2, desc: "Page contains email/username input" },
  { name: "has_otp_token_input", type: "binary", default: -1, stage: 2, desc: "Page contains OTP/2FA token input" },
  { name: "hidden_elements_count", type: "int", default: -1, stage: 2, desc: "Count of hidden input/overlay elements" },
  { name: "iframe_count", type: "int", default: -1, stage: 2, desc: "Total iframes embedded" },
  { name: "external_scripts_ratio", type: "float", default: -1.0, stage: 2, desc: "Ratio of scripts loaded externally" },
  { name: "external_css_ratio", type: "float", default: -1.0, stage: 2, desc: "Ratio of stylesheets loaded externally" },
  { name: "external_img_ratio", type: "float", default: -1.0, stage: 2, desc: "Ratio of images loaded externally" },
  { name: "favicon_origin_mismatch", type: "binary", default: -1, stage: 2, desc: "Favicon origin mismatch" },
  { name: "title_brand_mismatch", type: "binary", default: -1, stage: 2, desc: "Page title mentions brand not in domain" },
  { name: "has_meta_refresh", type: "binary", default: -1, stage: 2, desc: "Meta refresh tag present" },
  { name: "empty_anchor_ratio", type: "float", default: -1.0, stage: 2, desc: "Ratio of empty/dead anchors" },
  { name: "anchor_text_url_mismatch", type: "int", default: -1, stage: 2, desc: "Anchor text displays URL differing from href" },
  { name: "context_menu_disabled", type: "binary", default: -1, stage: 2, desc: "Right-click or selection disabled" },
  { name: "obfuscated_js_detected", type: "binary", default: -1, stage: 2, desc: "Obfuscated JS patterns detected" },

  // Stage 2: Form & Submission Features (31-35)
  { name: "form_action_cross_origin", type: "binary", default: -1, stage: 2, desc: "Form action posts cross-origin" },
  { name: "form_action_insecure", type: "binary", default: -1, stage: 2, desc: "Form action submits over HTTP" },
  { name: "form_action_empty", type: "binary", default: -1, stage: 2, desc: "Form action is empty or javascript:void" },
  { name: "credential_cross_post", type: "binary", default: -1, stage: 2, desc: "Password field form posts cross-origin" },
  { name: "sensitive_combo_detected", type: "binary", default: -1, stage: 2, desc: "Password + card + SSN combination" },

  // Stage 1/2: Redirect & Navigation Features (36-38)
  { name: "redirect_hop_count", type: "int", default: 0, stage: 1, desc: "Number of redirect hops" },
  { name: "redirect_cross_domain", type: "binary", default: 0, stage: 1, desc: "Redirect hopped across domains" },
  { name: "protocol_downgraded", type: "binary", default: 0, stage: 1, desc: "Downgraded from HTTPS to HTTP" },

  // Stage 1/2: TLS & Transport Features (39-41)
  { name: "is_https", type: "binary", default: 0, stage: 1, desc: "Page uses HTTPS" },
  { name: "has_mixed_content", type: "binary", default: 0, stage: 2, desc: "HTTPS page with HTTP subresources" },
  { name: "tls_validity_days", type: "int", default: -1, stage: 1, desc: "TLS cert validity days remaining" },

  // Stage 1: Reputation & Context Features (42-43)
  { name: "is_tranco_top_10k", type: "binary", default: 0, stage: 1, desc: "Domain in Tranco top-10k" },
  { name: "is_bloom_bad_hit", type: "binary", default: 0, stage: 1, desc: "Domain matches local bad Bloom filter" }
];

export const FEATURE_NAMES = FEATURE_DEFINITIONS.map(f => f.name);
export const FEATURE_NAME_TO_INDEX = Object.fromEntries(FEATURE_NAMES.map((name, i) => [name, i]));
export const FEATURE_COUNT = FEATURE_NAMES.length;

export const TOP_BRANDS = [
  "google", "microsoft", "apple", "amazon", "paypal", "facebook", "netflix",
  "instagram", "chase", "bankofamerica", "wellsfargo", "citibank", "yahoo",
  "dropbox", "linkedin", "twitter", "adobe", "github", "gitlab", "outlook",
  "office365", "icloud", "binance", "coinbase", "kraken", "metamask",
  "steam", "ebay", "walmart", "target", "dhl", "fedex", "usps", "ups"
];

export const SUSPICIOUS_TLDS = new Set([
  "xyz", "top", "tk", "ml", "ga", "cf", "gq", "buzz", "work", "loan",
  "click", "fit", "surf", "rest", "party", "gdn", "date", "racing", "kim",
  "men", "win", "bid", "stream", "trade", "accountant", "download"
]);

export const URL_SHORTENERS = new Set([
  "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly",
  "adf.ly", "bit.do", "cutt.ly", "rebrand.ly", "shorte.st"
]);
