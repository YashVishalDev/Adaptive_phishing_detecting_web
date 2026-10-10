"""
Unit tests for TrustLens companion backend.
"""

import os
import sys
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from backend.app.main import app

client = TestClient(app)

def test_health_endpoint():
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["service"] == "trustlens-companion"

def test_get_latest_model():
    res = client.get("/api/v1/model/latest")
    assert res.status_code == 200
    bundle = res.json()
    assert "model_version" in bundle
    assert "trees" in bundle
    assert bundle["feature_count"] == 44
    assert "signature" in bundle

def test_telemetry_differential_privacy():
    payload = {
        "feature_vector": [0.5] * 44,
        "noise_epsilon": 1.0,
        "client_timestamp": 1700000000
    }
    res = client.post("/api/v1/telemetry/differential-privacy", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "accepted"
    assert data["features_received"] == 44

def test_telemetry_invalid_vector():
    payload = {
        "feature_vector": [0.5] * 10, # invalid count
        "noise_epsilon": 1.0,
        "client_timestamp": 1700000000
    }
    res = client.post("/api/v1/telemetry/differential-privacy", json=payload)
    assert res.status_code == 400
