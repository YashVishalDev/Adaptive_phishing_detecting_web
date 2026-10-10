import { describe, it, expect } from "vitest";
import { LocalCalibrator } from "../src/adaptive/local-calibrator";
import { DriftDetector } from "../src/adaptive/drift-detector";
import { UpdateVerifier } from "../src/adaptive/update-verifier";
import bundledModel from "../src/engine/bundled-model.json";

describe("TrustLens Adaptive Engine & Security Hardening", () => {
  it("verifies LocalCalibrator applies bounded anti-poisoning shifts", () => {
    const calibrator = new LocalCalibrator();

    // 1. Initial shift is 0
    expect(calibrator.getShift()).toBe(0.0);
    expect(calibrator.calibrateScore(70)).toBe(70);

    // 2. User reports false positives
    const feedback = [
      { id: "1", domainHash: "h1", timestamp: Date.now(), userAction: "false_positive" as const, trustScore: 50, calibratedProbability: 0.5 },
      { id: "2", domainHash: "h2", timestamp: Date.now(), userAction: "false_positive" as const, trustScore: 52, calibratedProbability: 0.48 }
    ];

    calibrator.recomputeFromFeedback(feedback);
    expect(calibrator.getShift()).toBe(3.0); // +1.5 * 2
    expect(calibrator.calibrateScore(70)).toBe(73);

    // 3. Poisoning attempt: many false positives trying to bypass protection
    const poisoningAttempts = Array.from({ length: 20 }, (_, i) => ({
      id: `p_${i}`,
      domainHash: `h_${i}`,
      timestamp: Date.now(),
      userAction: "false_positive" as const,
      trustScore: 40,
      calibratedProbability: 0.6
    }));

    calibrator.recomputeFromFeedback(poisoningAttempts);
    // Hard anti-poisoning ceiling is 8.0
    expect(calibrator.getShift()).toBeLessThanOrEqual(8.0);
  });

  it("verifies DriftDetector computes Population Stability Index (PSI) correctly", () => {
    const detector = new DriftDetector();

    // With few samples, returns stable (insufficient sample volume)
    let report = detector.evaluateDrift();
    expect(report.sampleCount).toBe(0);
    expect(report.status).toBe("stable");

    // Feed normal distribution similar to baseline (half low, half high)
    for (let i = 0; i < 30; i++) {
      detector.recordScore(0.02); // Benign
      detector.recordScore(0.95); // Phish
    }

    report = detector.evaluateDrift();
    expect(report.sampleCount).toBe(60);
    expect(report.isDriftDetected).toBe(false);

    // Now induce severe distribution shift: 100 consecutive borderline ambiguous samples (0.50)
    for (let i = 0; i < 100; i++) {
      detector.recordScore(0.50);
    }

    const driftedReport = detector.evaluateDrift();
    expect(driftedReport.psiScore).toBeGreaterThanOrEqual(0.25);
    expect(driftedReport.isDriftDetected).toBe(true);
    expect(driftedReport.status).toBe("significant_drift");
  });

  it("verifies UpdateVerifier validates official signed bundle and rejects malformed bundles", async () => {
    // 1. Valid bundle test
    const validJson = JSON.stringify(bundledModel);
    const validRes = await UpdateVerifier.verifyBundle(validJson);
    expect(validRes.isValid).toBe(true);
    expect(validRes.bundleVersion).toBe("1.0.0");

    // 2. Reject malformed JSON
    const malformedRes = await UpdateVerifier.verifyBundle("not a json");
    expect(malformedRes.isValid).toBe(false);

    // 3. Reject incompatible schema (missing features)
    const incompatibleBundle = { ...bundledModel, feature_count: 20 };
    const incompatibleRes = await UpdateVerifier.verifyBundle(JSON.stringify(incompatibleBundle));
    expect(incompatibleRes.isValid).toBe(false);
    expect(incompatibleRes.error).toContain("Incompatible feature count");
  });
});
