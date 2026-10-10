/**
 * Master Feature Extractor in TypeScript.
 * Produces the full 44-dimensional canonical vector.
 */

import { extractUrlFeatures } from "./url-extractor";
import { extractDomFeaturesFromHtml } from "./dom-extractor";
import { FEATURE_NAMES } from "./schema";

export interface ExtractionContext {
  redirect_hop_count?: number;
  redirect_cross_domain?: boolean;
  protocol_downgraded?: boolean;
  has_mixed_content?: boolean;
  tls_validity_days?: number;
  is_tranco_top_10k?: boolean;
  is_bloom_bad_hit?: boolean;
}

export function extractAllFeatures(
  url: string,
  htmlContent?: string | null,
  context?: ExtractionContext
): number[] {
  const ctx = context || {};

  // Stage 1: URL features (0-15)
  const urlFeatures = extractUrlFeatures(url);

  // Stage 2: DOM & Form features (16-35)
  let domFeatures: number[];
  if (htmlContent != null) {
    domFeatures = extractDomFeaturesFromHtml(htmlContent, url);
  } else {
    // Missing defaults for Stage 1 evaluation
    domFeatures = Array(20).fill(-1.0);
  }

  // Redirect features (36-38)
  const redirect_hop_count = Number(ctx.redirect_hop_count || 0);
  const redirect_cross_domain = ctx.redirect_cross_domain ? 1.0 : 0.0;
  const protocol_downgraded = ctx.protocol_downgraded ? 1.0 : 0.0;

  // TLS features (39-41)
  let is_https = 0.0;
  try {
    is_https = new URL(url).protocol === "https:" ? 1.0 : 0.0;
  } catch {
    is_https = url.toLowerCase().startsWith("https://") ? 1.0 : 0.0;
  }
  const has_mixed_content = ctx.has_mixed_content ? 1.0 : 0.0;
  const tls_validity_days = ctx.tls_validity_days != null ? Number(ctx.tls_validity_days) : -1.0;

  // Reputation features (42-43)
  const is_tranco_top_10k = ctx.is_tranco_top_10k ? 1.0 : 0.0;
  const is_bloom_bad_hit = ctx.is_bloom_bad_hit ? 1.0 : 0.0;

  const vector = [
    ...urlFeatures,
    ...domFeatures,
    redirect_hop_count,
    redirect_cross_domain,
    protocol_downgraded,
    is_https,
    has_mixed_content,
    tls_validity_days,
    is_tranco_top_10k,
    is_bloom_bad_hit
  ];

  if (vector.length !== FEATURE_NAMES.length) {
    throw new Error(`Vector length mismatch: ${vector.length} vs expected ${FEATURE_NAMES.length}`);
  }

  return vector;
}
