/**
 * TrustLens DOM & Form Feature Extractor in TypeScript.
 * Operates on browser Document or parses HTML strings for testing.
 */

import { TOP_BRANDS } from "./schema";
import { parseDomainParts } from "./url-extractor";

export function extractDomFeaturesFromHtml(htmlContent: string, currentUrl: string): number[] {
  let hostname = "";
  let pageScheme = "https";
  let apexDomain = "";
  try {
    const u = new URL(currentUrl);
    hostname = u.hostname.toLowerCase();
    pageScheme = u.protocol.replace(":", "");
    apexDomain = parseDomainParts(hostname).apexDomain;
  } catch {
    hostname = "unknown";
  }

  const rawLower = htmlContent.toLowerCase();

  // 16: has_password_input
  const has_password_input = /<input[^>]+type=["']?password["']?/i.test(htmlContent) ? 1.0 : 0.0;

  // 17: has_email_input
  const has_email_input = (
    /<input[^>]+type=["']?email["']?/i.test(htmlContent) ||
    /<input[^>]+(?:name|id)=["']?[^"']*(?:email|username|user|login)[^"']*["']?/i.test(htmlContent)
  ) ? 1.0 : 0.0;

  // 18: has_otp_token_input
  const has_otp_token_input = /<input[^>]+(?:name|id|placeholder)=["']?[^"']*(?:otp|token|2fa|mfa|totp|verification_code)[^"']*["']?/i.test(htmlContent) ? 1.0 : 0.0;

  // 19: hidden_elements_count
  const hiddenInputs = (htmlContent.match(/<input[^>]+type=["']?hidden["']?/gi) || []).length;
  const displayNone = (htmlContent.match(/style=["'][^"']*display\s*:\s*none[^"']*["']/gi) || []).length;
  const visibilityHidden = (htmlContent.match(/style=["'][^"']*visibility\s*:\s*hidden[^"']*["']/gi) || []).length;
  const hidden_elements_count = Number(hiddenInputs + displayNone + visibilityHidden);

  // 20: iframe_count
  const iframe_count = Number((htmlContent.match(/<iframe\b[^>]*>/gi) || []).length);

  // Helper for origin match
  const isForeignOrigin = (src: string): boolean => {
    if (!src || !src.includes("://")) return false;
    try {
      const u = new URL(src);
      const h = u.hostname.toLowerCase();
      return h !== hostname && !h.endsWith("." + apexDomain);
    } catch {
      return false;
    }
  };

  // 21: external_scripts_ratio
  const scriptTags = htmlContent.match(/<script\b[^>]*src=["']([^"']+)["'][^>]*>/gi) || [];
  let foreignScripts = 0;
  for (const tag of scriptTags) {
    const match = /src=["']([^"']+)["']/i.exec(tag);
    if (match && isForeignOrigin(match[1])) foreignScripts++;
  }
  const external_scripts_ratio = scriptTags.length > 0 ? Number((foreignScripts / scriptTags.length).toFixed(4)) : 0.0;

  // 22: external_css_ratio
  const cssTags = htmlContent.match(/<link\b[^>]*rel=["']?stylesheet["']?[^>]*href=["']([^"']+)["'][^>]*>/gi) ||
                  htmlContent.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*rel=["']?stylesheet["']?[^>]*>/gi) || [];
  let foreignCss = 0;
  for (const tag of cssTags) {
    const match = /href=["']([^"']+)["']/i.exec(tag);
    if (match && isForeignOrigin(match[1])) foreignCss++;
  }
  const external_css_ratio = cssTags.length > 0 ? Number((foreignCss / cssTags.length).toFixed(4)) : 0.0;

  // 23: external_img_ratio
  const imgTags = htmlContent.match(/<img\b[^>]*src=["']([^"']+)["'][^>]*>/gi) || [];
  let foreignImgs = 0;
  for (const tag of imgTags) {
    const match = /src=["']([^"']+)["']/i.exec(tag);
    if (match && isForeignOrigin(match[1])) foreignImgs++;
  }
  const external_img_ratio = imgTags.length > 0 ? Number((foreignImgs / imgTags.length).toFixed(4)) : 0.0;

  // 24: favicon_origin_mismatch
  let favicon_origin_mismatch = 0.0;
  const iconMatch = /<link\b[^>]*rel=["']?(?:shortcut )?icon["']?[^>]*href=["']([^"']+)["']/i.exec(htmlContent) ||
                    /<link\b[^>]*href=["']([^"']+)["'][^>]*rel=["']?(?:shortcut )?icon["']?/i.exec(htmlContent);
  if (iconMatch && isForeignOrigin(iconMatch[1])) {
    favicon_origin_mismatch = 1.0;
  }

  // 25: title_brand_mismatch
  let title_brand_mismatch = 0.0;
  const titleMatch = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(htmlContent);
  const titleText = titleMatch ? titleMatch[1].toLowerCase() : "";
  for (const brand of TOP_BRANDS) {
    if (titleText.includes(brand) && !apexDomain.includes(brand)) {
      title_brand_mismatch = 1.0;
      break;
    }
  }

  // 26: has_meta_refresh
  const has_meta_refresh = /<meta\b[^>]*http-equiv=["']?refresh["']?/i.test(htmlContent) ? 1.0 : 0.0;

  // 27: empty_anchor_ratio & 28: anchor_text_url_mismatch
  const anchorRegex = /<a\b[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let totalAnchors = 0;
  let emptyAnchors = 0;
  let mismatchedAnchors = 0;
  let aMatch: RegExpExecArray | null;

  while ((aMatch = anchorRegex.exec(htmlContent)) !== null) {
    totalAnchors++;
    const href = aMatch[1].trim().toLowerCase();
    if (["#", "", "javascript:void(0)", "javascript:void(0);", "javascript:;"].includes(href)) {
      emptyAnchors++;
    }
    const text = aMatch[2].replace(/<[^>]+>/g, "").trim().toLowerCase();
    if (text.startsWith("http://") || text.startsWith("https://")) {
      try {
        const textHost = new URL(text).hostname.toLowerCase();
        if (href.includes("://")) {
          const hrefHost = new URL(href).hostname.toLowerCase();
          if (textHost && hrefHost && textHost !== hrefHost) {
            mismatchedAnchors++;
          }
        }
      } catch {}
    }
  }

  const empty_anchor_ratio = totalAnchors > 0 ? Number((emptyAnchors / totalAnchors).toFixed(4)) : 0.0;
  const anchor_text_url_mismatch = Number(mismatchedAnchors);

  // 29: context_menu_disabled
  const context_menu_disabled = (
    rawLower.includes('oncontextmenu="return false"') ||
    rawLower.includes("oncontextmenu='return false'") ||
    rawLower.includes("addeventlistener('contextmenu'") ||
    rawLower.includes('addeventlistener("contextmenu"')
  ) ? 1.0 : 0.0;

  // 30: obfuscated_js_detected
  const evalCount = (rawLower.match(/\beval\s*\(/g) || []).length;
  const unescapeCount = (rawLower.match(/\bunescape\s*\(/g) || []).length;
  const atobCount = (rawLower.match(/\batob\s*\(/g) || []).length;
  const obfuscated_js_detected = (evalCount + unescapeCount + atobCount) >= 2 ? 1.0 : 0.0;

  // Form features (31-35)
  const formRegex = /<form\b([^>]*)>([\s\S]*?)<\/form>/gi;
  let form_action_cross_origin = 0.0;
  let form_action_insecure = 0.0;
  let form_action_empty = 0.0;
  let credential_cross_post = 0.0;
  let sensitive_combo_detected = 0.0;

  let fMatch: RegExpExecArray | null;
  while ((fMatch = formRegex.exec(htmlContent)) !== null) {
    const formAttrs = fMatch[1];
    const formInner = fMatch[2];
    const actionMatch = /action=["']([^"']*)["']/i.exec(formAttrs);
    const action = actionMatch ? actionMatch[1].trim() : "";

    const hasPw = /<input[^>]+type=["']?password["']?/i.test(formInner);
    const hasCard = /<input[^>]+(?:name|id)=["']?[^"']*(?:card|cc|cvv|credit)[^"']*["']?/i.test(formInner);
    const hasSsn = /<input[^>]+(?:name|id)=["']?[^"']*(?:ssn|social|identity|tax_id)[^"']*["']?/i.test(formInner);

    if (hasPw && hasCard && hasSsn) {
      sensitive_combo_detected = 1.0;
    }

    if (!action || ["#", "about:blank", "javascript:void(0)"].includes(action.toLowerCase())) {
      form_action_empty = 1.0;
    } else if (action.includes("://")) {
      try {
        const actHost = new URL(action).hostname.toLowerCase();
        const actApex = parseDomainParts(actHost).apexDomain;
        if (actApex && actApex !== apexDomain) {
          form_action_cross_origin = 1.0;
          if (hasPw) {
            credential_cross_post = 1.0;
          }
        }
        if (action.toLowerCase().startsWith("http://") && pageScheme === "https") {
          form_action_insecure = 1.0;
        }
      } catch {}
    }
  }

  return [
    has_password_input, has_email_input, has_otp_token_input, hidden_elements_count,
    iframe_count, external_scripts_ratio, external_css_ratio, external_img_ratio,
    favicon_origin_mismatch, title_brand_mismatch, has_meta_refresh, empty_anchor_ratio,
    anchor_text_url_mismatch, context_menu_disabled, obfuscated_js_detected,
    form_action_cross_origin, form_action_insecure, form_action_empty,
    credential_cross_post, sensitive_combo_detected
  ];
}
