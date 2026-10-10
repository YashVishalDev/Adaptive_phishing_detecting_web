"""
pytest test suite for TrustLens ML components.
"""

import math
import os
import sys
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.features.schema import FEATURE_DEFINITIONS, FEATURE_NAMES, FEATURE_COUNT
from src.features.extractor import (
    FeatureExtractor,
    damerau_levenshtein_distance,
    parse_domain_parts,
    compute_shannon_entropy
)

def test_feature_schema():
    assert len(FEATURE_DEFINITIONS) == 44
    assert len(FEATURE_NAMES) == 44
    assert FEATURE_COUNT == 44
    for f in FEATURE_DEFINITIONS:
        assert "name" in f
        assert "stage" in f
        assert f["stage"] in (1, 2)
        assert "default" in f

def test_damerau_levenshtein():
    assert damerau_levenshtein_distance("paypal", "paypal") == 0
    assert damerau_levenshtein_distance("paypa1", "paypal") == 1
    assert damerau_levenshtein_distance("pyapal", "paypal") == 1 # transposition
    assert damerau_levenshtein_distance("google", "microsoft") > 3

def test_parse_domain_parts():
    apex, name, tld, subs = parse_domain_parts("login.paypal.com")
    assert apex == "paypal.com"
    assert name == "paypal"
    assert tld == "com"
    assert subs == ["login"]

    # Multi-part TLD test
    apex, name, tld, subs = parse_domain_parts("portal.service.gov.uk")
    assert apex == "service.gov.uk"
    assert name == "service"
    assert tld == "gov.uk"
    assert subs == ["portal"]

def test_shannon_entropy():
    assert compute_shannon_entropy("") == 0.0
    assert compute_shannon_entropy("aaaa") == 0.0
    # Two symbols equally likely -> 1.0 bit
    assert math.isclose(compute_shannon_entropy("abab"), 1.0, abs_tol=1e-4)

def test_feature_extractor_stage1():
    url = "https://www.paypal.com/signin"
    features = FeatureExtractor.extract_features(url, html_content=None)
    assert len(features) == 44
    # DOM features must be -1.0 when HTML is None
    assert features[16] == -1.0 # has_password_input
    assert features[17] == -1.0 # has_email_input
    assert features[39] == 1.0  # is_https
