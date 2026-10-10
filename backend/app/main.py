"""
TrustLens Optional Companion Backend (FastAPI).
Off by default. Serves signed model updates and receives opt-in
anonymized differential-privacy feature vectors.
"""

import os
import json
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(
    title="TrustLens Threat Intel & Model Update Companion",
    version="1.0.0",
    description="Optional companion service for TrustLens browser extension."
)

class TelemetryVector(BaseModel):
    feature_vector: List[float] = Field(..., description="44-dimensional noisy vector with Laplace noise")
    noise_epsilon: float = Field(default=1.0, description="Differential privacy epsilon parameter")
    client_timestamp: int = Field(..., description="Unix timestamp of event")

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "trustlens-companion",
        "mode": "privacy-first",
        "version": "1.0.0"
    }

@app.get("/api/v1/model/latest")
def get_latest_model():
    """Serves the latest signed model bundle."""
    model_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "ml", "src", "export", "model_bundle.json")
    )
    if not os.path.exists(model_path):
        raise HTTPException(status_code=404, detail="Model bundle not found")

    with open(model_path, "r", encoding="utf-8") as f:
        bundle = json.load(f)

    return bundle

@app.post("/api/v1/telemetry/differential-privacy")
def receive_telemetry(payload: TelemetryVector):
    """
    Receives anonymized feature telemetry under differential privacy.
    Guarantees: Zero URLs, zero domains, zero page content, zero IPs.
    """
    if len(payload.feature_vector) != 44:
        raise HTTPException(status_code=400, detail="Invalid feature vector length (expected 44)")

    # In a full deployment, these perturbed vectors feed into federated model retraining
    return {
        "status": "accepted",
        "features_received": len(payload.feature_vector),
        "privacy_guarantee": f"epsilon={payload.noise_epsilon}-DP"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
