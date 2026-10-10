/**
 * TrustLens URL Feature Extractor in TypeScript.
 * 100% logic and output parity with Python implementation.
 */

import {
  TOP_BRANDS,
  SUSPICIOUS_TLDS,
  URL_SHORTENERS
} from "./schema";

const MULTI_PART_TLDS = new Set([
  "co.uk", "org.uk", "gov.uk", "ac.uk", "com.au", "net.au", "org.au",
  "co.nz", "co.jp", "com.br", "co.in", "net.in", "org.in", "gen.in"
]);

export function damerauLevenshteinDistance(s1: str, s2: str): number {
  type str = string;
  const len1 = s1.length;
  const len2 = s2.length;
  const d: number[][] = Array.from({ length: len1 + 1 }, () => Array(len2 + 1).fill(0));

  for (let i = 0; i <= len1; i++) d[i][0] = i;
  for (let j = 0; j <= len2; j++) d[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,       // deletion
        d[i][j - 1] + 1,       // insertion
        d[i - 1][j - 1] + cost // substitution
      );
      if (i > 1 && j > 1 && s1[i - 1] === s2[j - 2] && s1[i - 2] === s2[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + cost); // transposition
      }
    }
  }

  return d[len1][len2];
}

export interface DomainParts {
  apexDomain: string;
  domainName: string;
  tld: string;
  subdomains: string[];
}

export function parseDomainParts(hostname: string): DomainParts {
  let cleanHost = hostname.toLowerCase().trim();
  if (!cleanHost) {
    return { apexDomain: "", domainName: "", tld: "", subdomains: [] };
  }

  if (cleanHost.includes(":")) {
    cleanHost = cleanHost.split(":")[0];
  }

  const parts = cleanHost.split(".");
  if (parts.length <= 1) {
    return { apexDomain: cleanHost, domainName: cleanHost, tld: "", subdomains: [] };
  }

  const lastTwo = parts.slice(-2).join(".");
  if (MULTI_PART_TLDS.has(lastTwo) && parts.length >= 3) {
    const tld = lastTwo;
    const domainName = parts[parts.length - 3];
    const apexDomain = `${domainName}.${tld}`;
    const subdomains = parts.slice(0, parts.length - 3);
    return { apexDomain, domainName, tld, subdomains };
  } else {
    const tld = parts[parts.length - 1];
    const domainName = parts[parts.length - 2];
    const apexDomain = `${domainName}.${tld}`;
    const subdomains = parts.slice(0, parts.length - 2);
    return { apexDomain, domainName, tld, subdomains };
  }
}

export function computeShannonEntropy(s: string): number {
  if (!s) return 0.0;
  const length = s.length;
  const freq: Record<string, number> = {};
  for (let i = 0; i < length; i++) {
    const c = s[i];
    freq[c] = (freq[c] || 0) + 1;
  }
  let entropy = 0.0;
  for (const count of Object.values(freq)) {
    const p = count / length;
    entropy -= p * Math.log2(p);
  }
  return Number(entropy.toFixed(4));
}

export function extractUrlFeatures(urlStr: string): number[] {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(urlStr);
  } catch {
    // If protocol missing, assume http://
    try {
      parsedUrl = new URL("http://" + urlStr);
    } catch {
      parsedUrl = new URL("http://unknown");
    }
  }

  const rawHost = parsedUrl.hostname.toLowerCase();
  const hostname = rawHost;
  const port = parsedUrl.port ? parseInt(parsedUrl.port, 10) : null;
  const path = parsedUrl.pathname || "";

  const { apexDomain, domainName, tld, subdomains } = parseDomainParts(hostname);

  const url_length = urlStr.length;
  const domain_length = hostname.length;
  const subdomain_count = subdomains.length;

  const ipv4Regex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
  const is_ip_host = (ipv4Regex.test(hostname) || (hostname.includes(":") && !port)) ? 1.0 : 0.0;

  let has_punycode = 0.0;
  if (hostname.includes("xn--")) {
    has_punycode = 1.0;
  } else {
    for (let i = 0; i < hostname.length; i++) {
      if (hostname.charCodeAt(i) > 127) {
        has_punycode = 1.0;
        break;
      }
    }
  }

  const entropy_domain = computeShannonEntropy(domainName || hostname);

  let digitCount = 0;
  for (let i = 0; i < urlStr.length; i++) {
    const code = urlStr.charCodeAt(i);
    if (code >= 48 && code <= 57) digitCount++;
  }
  const digit_ratio_url = urlStr.length > 0 ? Number((digitCount / urlStr.length).toFixed(4)) : 0.0;

  const specialChars = "@//-_=%";
  let specialCount = 0;
  for (let i = 0; i < urlStr.length; i++) {
    if (specialChars.includes(urlStr[i])) specialCount++;
  }
  const special_char_count = specialCount;

  const has_at_symbol = urlStr.includes("@") ? 1.0 : 0.0;

  let double_slash_redirect = 0.0;
  const afterScheme = urlStr.includes("://") ? urlStr.split("://")[1] : urlStr;
  if (afterScheme && afterScheme.includes("//")) {
    double_slash_redirect = 1.0;
  }

  const suspicious_tld = SUSPICIOUS_TLDS.has(tld.toLowerCase()) ? 1.0 : 0.0;
  const is_known_shortener = (URL_SHORTENERS.has(apexDomain) || URL_SHORTENERS.has(hostname)) ? 1.0 : 0.0;

  let port_anomaly = 0.0;
  if (port !== null && port !== 80 && port !== 443) {
    port_anomaly = 1.0;
  }

  const subdomainStr = subdomains.join(".").toLowerCase();
  const pathLower = path.toLowerCase();
  let brand_in_subdomain = 0.0;
  let brand_in_path = 0.0;
  let min_typosquat_dist = 10.0;

  for (const brand of TOP_BRANDS) {
    if (subdomainStr.includes(brand)) {
      brand_in_subdomain = 1.0;
    }
    if (pathLower.includes(brand) && !apexDomain.includes(brand)) {
      brand_in_path = 1.0;
    }
    if (domainName) {
      const dist = damerauLevenshteinDistance(domainName, brand);
      if (dist < min_typosquat_dist) {
        min_typosquat_dist = dist;
      }
    }
  }

  return [
    url_length, domain_length, subdomain_count, is_ip_host, has_punycode,
    entropy_domain, digit_ratio_url, special_char_count, has_at_symbol,
    double_slash_redirect, suspicious_tld, is_known_shortener, port_anomaly,
    brand_in_subdomain, brand_in_path, min_typosquat_dist
  ];
}
