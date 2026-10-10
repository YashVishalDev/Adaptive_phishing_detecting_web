"""
TrustLens Feature Extractor in Python.
Computes 44-dimensional feature vector matching the canonical schema.
Designed for 100% mathematical and logic parity with TypeScript extractor.
"""

import math
import re
from typing import Dict, List, Optional, Any, Tuple
from urllib.parse import urlparse
from bs4 import BeautifulSoup

from .schema import (
    FEATURE_NAMES,
    FEATURE_DEFINITIONS,
    TOP_BRANDS,
    SUSPICIOUS_TLDS,
    URL_SHORTENERS
)

# Common multi-part TLD suffixes
MULTI_PART_TLDS = {
    "co.uk", "org.uk", "gov.uk", "ac.uk", "com.au", "net.au", "org.au",
    "co.nz", "co.jp", "com.br", "co.in", "net.in", "org.in", "gen.in"
}


def damerau_levenshtein_distance(s1: str, s2: str) -> int:
    """Calculates Damerau-Levenshtein distance between two strings."""
    len1, len2 = len(s1), len(s2)
    d = [[0] * (len2 + 1) for _ in range(len1 + 1)]

    for i in range(len1 + 1):
        d[i][0] = i
    for j in range(len2 + 1):
        d[0][j] = j

    for i in range(1, len1 + 1):
        for j in range(1, len2 + 1):
            cost = 0 if s1[i - 1] == s2[j - 1] else 1
            d[i][j] = min(
                d[i - 1][j] + 1,       # deletion
                d[i][j - 1] + 1,       # insertion
                d[i - 1][j - 1] + cost # substitution
            )
            if i > 1 and j > 1 and s1[i - 1] == s2[j - 2] and s1[i - 2] == s2[j - 1]:
                d[i][j] = min(d[i][j], d[i - 2][j - 2] + cost) # transposition

    return d[len1][len2]


def parse_domain_parts(hostname: str) -> Tuple[str, str, str, List[str]]:
    """
    Parses hostname into (apex_domain, domain_name_without_tld, tld, subdomains).
    Example: 'login.account.paypal.com' -> ('paypal.com', 'paypal', 'com', ['login', 'account'])
    """
    hostname = hostname.lower().strip()
    if not hostname:
        return "", "", "", []

    # Strip port if present
    if ":" in hostname:
        hostname = hostname.split(":")[0]

    parts = hostname.split(".")
    if len(parts) <= 1:
        return hostname, hostname, "", []

    # Check multi-part TLD
    last_two = ".".join(parts[-2:])
    if last_two in MULTI_PART_TLDS and len(parts) >= 3:
        tld = last_two
        apex_name = parts[-3]
        apex_domain = f"{apex_name}.{tld}"
        subdomains = parts[:-3]
    else:
        tld = parts[-1]
        apex_name = parts[-2]
        apex_domain = f"{apex_name}.{tld}"
        subdomains = parts[:-2]

    return apex_domain, apex_name, tld, subdomains


def compute_shannon_entropy(s: str) -> float:
    """Computes Shannon entropy of string s, rounded to 4 decimals."""
    if not s:
        return 0.0
    length = len(s)
    freq: Dict[str, int] = {}
    for c in s:
        freq[c] = freq.get(c, 0) + 1
    entropy = 0.0
    for count in freq.values():
        p = count / length
        entropy -= p * math.log2(p)
    return round(entropy, 4)


class FeatureExtractor:
    """Pure feature extractor computing 44-dimensional canonical vector."""

    @classmethod
    def extract_features(
        cls,
        url: str,
        html_content: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> List[float]:
        """
        Extracts 44-dimensional feature vector.
        Features match FEATURE_DEFINITIONS list order exactly.
        """
        ctx = context or {}
        parsed = urlparse(url)
        raw_host = (parsed.hostname or "").lower()
        hostname = raw_host
        port = parsed.port
        path = parsed.path or ""

        apex_domain, domain_name, tld, subdomains = parse_domain_parts(hostname)

        # ---------------- Stage 1: URL Features (0-15) ----------------
        url_length = float(len(url))
        domain_length = float(len(hostname))
        subdomain_count = float(len(subdomains))

        # is_ip_host
        ip_v4_pattern = r"^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$"
        is_ip_host = 1.0 if re.match(ip_v4_pattern, hostname) or (":" in parsed.netloc and not parsed.port) else 0.0

        # has_punycode
        has_punycode = 1.0 if "xn--" in hostname or any(ord(c) > 127 for c in hostname) else 0.0

        # entropy_domain
        entropy_domain = compute_shannon_entropy(domain_name if domain_name else hostname)

        # digit_ratio_url
        digits = sum(1 for c in url if c.isdigit())
        digit_ratio_url = round(digits / len(url), 4) if len(url) > 0 else 0.0

        # special_char_count
        special_chars = sum(1 for c in url if c in "@//-_=%")
        special_char_count = float(special_chars)

        # has_at_symbol
        has_at_symbol = 1.0 if "@" in url else 0.0

        # double_slash_redirect (beyond protocol)
        double_slash_redirect = 1.0 if "//" in (url.split("://", 1)[1] if "://" in url else url) else 0.0

        # suspicious_tld
        suspicious_tld = 1.0 if tld.lower() in SUSPICIOUS_TLDS else 0.0

        # is_known_shortener
        is_known_shortener = 1.0 if apex_domain in URL_SHORTENERS or hostname in URL_SHORTENERS else 0.0

        # port_anomaly
        port_anomaly = 1.0 if (port is not None and port not in (80, 443)) else 0.0

        # brand_in_subdomain & brand_in_path
        subdomain_str = ".".join(subdomains).lower()
        path_lower = path.lower()
        brand_in_subdomain = 0.0
        brand_in_path = 0.0
        min_typosquat_dist = 10.0

        for brand in TOP_BRANDS:
            if brand in subdomain_str:
                brand_in_subdomain = 1.0
            if brand in path_lower and brand not in apex_domain:
                brand_in_path = 1.0
            if domain_name:
                dist = damerau_levenshtein_distance(domain_name, brand)
                if dist < min_typosquat_dist:
                    min_typosquat_dist = float(dist)

        # ---------------- Stage 2: DOM & Form Features (16-35) ----------------
        if html_content is not None:
            soup = BeautifulSoup(html_content, "html.parser")

            # 16: has_password_input
            pw_inputs = soup.find_all("input", attrs={"type": re.compile(r"^password$", re.I)})
            has_password_input = 1.0 if len(pw_inputs) > 0 else 0.0

            # 17: has_email_input
            email_inputs = soup.find_all(
                lambda tag: tag.name == "input" and (
                    str(tag.get("type", "")).lower() == "email" or
                    any(k in str(tag.get("name", "")).lower() for k in ("email", "username", "user", "login")) or
                    any(k in str(tag.get("id", "")).lower() for k in ("email", "username", "user", "login"))
                )
            )
            has_email_input = 1.0 if len(email_inputs) > 0 else 0.0

            # 18: has_otp_token_input
            otp_inputs = soup.find_all(
                lambda tag: tag.name == "input" and any(
                    k in (str(tag.get("name", "")) + str(tag.get("id", "")) + str(tag.get("placeholder", ""))).lower()
                    for k in ("otp", "token", "2fa", "mfa", "totp", "verification_code")
                )
            )
            has_otp_token_input = 1.0 if len(otp_inputs) > 0 else 0.0

            # 19: hidden_elements_count
            hidden_tags = soup.find_all(
                lambda tag: (tag.name == "input" and str(tag.get("type", "")).lower() == "hidden") or
                ("display:none" in str(tag.get("style", "")).replace(" ", "").lower()) or
                ("visibility:hidden" in str(tag.get("style", "")).replace(" ", "").lower())
            )
            hidden_elements_count = float(len(hidden_tags))

            # 20: iframe_count
            iframe_count = float(len(soup.find_all("iframe")))

            # Asset origins
            scripts = soup.find_all("script", src=True)
            foreign_scripts = 0
            for s in scripts:
                src = str(s["src"]).lower()
                if "://" in src:
                    s_host = urlparse(src).netloc.split(":")[0]
                    if s_host and s_host != hostname and not s_host.endswith("." + apex_domain):
                        foreign_scripts += 1
            external_scripts_ratio = round(foreign_scripts / len(scripts), 4) if scripts else 0.0

            stylesheets = soup.find_all("link", rel=lambda r: r and "stylesheet" in [x.lower() for x in (r if isinstance(r, list) else [r])])
            foreign_css = 0
            for c in stylesheets:
                href = str(c.get("href", "")).lower()
                if "://" in href:
                    c_host = urlparse(href).netloc.split(":")[0]
                    if c_host and c_host != hostname and not c_host.endswith("." + apex_domain):
                        foreign_css += 1
            external_css_ratio = round(foreign_css / len(stylesheets), 4) if stylesheets else 0.0

            images = soup.find_all("img", src=True)
            foreign_img = 0
            for img in images:
                src = str(img["src"]).lower()
                if "://" in src:
                    i_host = urlparse(src).netloc.split(":")[0]
                    if i_host and i_host != hostname and not i_host.endswith("." + apex_domain):
                        foreign_img += 1
            external_img_ratio = round(foreign_img / len(images), 4) if images else 0.0

            # 24: favicon_origin_mismatch
            favicon = soup.find("link", rel=lambda r: r and any(x.lower() in ("icon", "shortcut icon") for x in (r if isinstance(r, list) else [r])))
            favicon_origin_mismatch = 0.0
            if favicon and favicon.get("href"):
                f_href = str(favicon["href"]).lower()
                if "://" in f_href:
                    f_host = urlparse(f_href).netloc.split(":")[0]
                    if f_host and f_host != hostname and not f_host.endswith("." + apex_domain):
                        favicon_origin_mismatch = 1.0

            # 25: title_brand_mismatch
            title_tag = soup.find("title")
            title_text = title_tag.get_text().lower() if title_tag else ""
            title_brand_mismatch = 0.0
            for brand in TOP_BRANDS:
                if brand in title_text and brand not in apex_domain:
                    title_brand_mismatch = 1.0
                    break

            # 26: has_meta_refresh
            meta_refresh = soup.find("meta", attrs={"http-equiv": re.compile(r"^refresh$", re.I)})
            has_meta_refresh = 1.0 if meta_refresh else 0.0

            # 27: empty_anchor_ratio
            anchors = soup.find_all("a")
            empty_anchors = 0
            mismatched_anchors = 0
            for a in anchors:
                href = str(a.get("href", "")).strip().lower()
                if href in ("#", "", "javascript:void(0)", "javascript:void(0);", "javascript:;"):
                    empty_anchors += 1
                text = a.get_text().strip().lower()
                if text.startswith("http://") or text.startswith("https://"):
                    text_host = urlparse(text).netloc.split(":")[0]
                    href_host = urlparse(href).netloc.split(":")[0] if "://" in href else ""
                    if text_host and href_host and text_host != href_host:
                        mismatched_anchors += 1

            empty_anchor_ratio = round(empty_anchors / len(anchors), 4) if anchors else 0.0
            anchor_text_url_mismatch = float(mismatched_anchors)

            # 29: context_menu_disabled
            raw_html_lower = html_content.lower()
            context_menu_disabled = 1.0 if (
                "oncontextmenu=\"return false\"" in raw_html_lower or
                "oncontextmenu='return false'" in raw_html_lower or
                "addeventlistener('contextmenu'" in raw_html_lower or
                'addeventlistener("contextmenu"' in raw_html_lower
            ) else 0.0

            # 30: obfuscated_js_detected
            obfuscated_count = (
                raw_html_lower.count("eval(") +
                raw_html_lower.count("unescape(") +
                raw_html_lower.count("atob(")
            )
            obfuscated_js_detected = 1.0 if obfuscated_count >= 2 else 0.0

            # Forms (31-35)
            forms = soup.find_all("form")
            form_action_cross_origin = 0.0
            form_action_insecure = 0.0
            form_action_empty = 0.0
            credential_cross_post = 0.0
            sensitive_combo_detected = 0.0

            for f in forms:
                action = str(f.get("action", "")).strip().lower()
                form_has_pw = len(f.find_all("input", attrs={"type": re.compile(r"^password$", re.I)})) > 0
                form_has_card = len(f.find_all(lambda tag: tag.name == "input" and any(k in (str(tag.get("name", "")) + str(tag.get("id", ""))).lower() for k in ("card", "cc", "cvv", "credit")))) > 0
                form_has_ssn = len(f.find_all(lambda tag: tag.name == "input" and any(k in (str(tag.get("name", "")) + str(tag.get("id", ""))).lower() for k in ("ssn", "social", "identity", "tax_id")))) > 0

                if form_has_pw and form_has_card and form_has_ssn:
                    sensitive_combo_detected = 1.0

                if not action or action in ("#", "about:blank", "javascript:void(0)"):
                    form_action_empty = 1.0
                elif "://" in action:
                    f_action_host = urlparse(action).netloc.split(":")[0]
                    f_action_apex, _, _, _ = parse_domain_parts(f_action_host)
                    if f_action_apex and f_action_apex != apex_domain:
                        form_action_cross_origin = 1.0
                        if form_has_pw:
                            credential_cross_post = 1.0
                    if action.startswith("http://") and parsed.scheme == "https":
                        form_action_insecure = 1.0

        else:
            # DOM not available (Stage 1 navigation start)
            has_password_input = -1.0
            has_email_input = -1.0
            has_otp_token_input = -1.0
            hidden_elements_count = -1.0
            iframe_count = -1.0
            external_scripts_ratio = -1.0
            external_css_ratio = -1.0
            external_img_ratio = -1.0
            favicon_origin_mismatch = -1.0
            title_brand_mismatch = -1.0
            has_meta_refresh = -1.0
            empty_anchor_ratio = -1.0
            anchor_text_url_mismatch = -1.0
            context_menu_disabled = -1.0
            obfuscated_js_detected = -1.0
            form_action_cross_origin = -1.0
            form_action_insecure = -1.0
            form_action_empty = -1.0
            credential_cross_post = -1.0
            sensitive_combo_detected = -1.0

        # ---------------- Stage 1/2: Redirects & Transport & Reputation (36-43) ----------------
        redirect_hop_count = float(ctx.get("redirect_hop_count", 0))
        redirect_cross_domain = float(1.0 if ctx.get("redirect_cross_domain", False) else 0.0)
        protocol_downgraded = float(1.0 if ctx.get("protocol_downgraded", False) else 0.0)

        is_https = 1.0 if parsed.scheme == "https" else 0.0
        has_mixed_content = float(1.0 if ctx.get("has_mixed_content", False) else 0.0)
        tls_validity_days = float(ctx.get("tls_validity_days", -1))

        is_tranco_top_10k = float(1.0 if ctx.get("is_tranco_top_10k", False) else 0.0)
        is_bloom_bad_hit = float(1.0 if ctx.get("is_bloom_bad_hit", False) else 0.0)

        # Assemble strictly in schema order
        vector = [
            url_length, domain_length, subdomain_count, is_ip_host, has_punycode,
            entropy_domain, digit_ratio_url, special_char_count, has_at_symbol,
            double_slash_redirect, suspicious_tld, is_known_shortener, port_anomaly,
            brand_in_subdomain, brand_in_path, min_typosquat_dist,
            has_password_input, has_email_input, has_otp_token_input, hidden_elements_count,
            iframe_count, external_scripts_ratio, external_css_ratio, external_img_ratio,
            favicon_origin_mismatch, title_brand_mismatch, has_meta_refresh, empty_anchor_ratio,
            anchor_text_url_mismatch, context_menu_disabled, obfuscated_js_detected,
            form_action_cross_origin, form_action_insecure, form_action_empty,
            credential_cross_post, sensitive_combo_detected,
            redirect_hop_count, redirect_cross_domain, protocol_downgraded,
            is_https, has_mixed_content, tls_validity_days,
            is_tranco_top_10k, is_bloom_bad_hit
        ]

        assert len(vector) == len(FEATURE_NAMES), f"Mismatch in vector length: {len(vector)} vs {len(FEATURE_NAMES)}"
        return vector
