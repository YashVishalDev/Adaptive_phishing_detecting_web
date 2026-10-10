/**
 * Trust Score Fusion & Verdict Engine for TrustLens.
 * Fuses calibrated tree ensemble probabilities with deterministic rule penalties
 * to produce an integer Trust Score (0-100) and actionable verdict.
 */

import { RuleResult } from "./rule-layer";

export type SensitivityLevel = "relaxed" | "balanced" | "strict";
export type Verdict = "Safe" | "Caution" | "Suspicious" | "Dangerous";

export interface FusionResult {
  trustScore: number;                 // 0 to 100
  verdict: Verdict;
  calibratedPhishProbability: number; // 0.0 to 1.0
  ruleMultiplier: number;
  criticalRulesTriggered: RuleResult[];
  warningRulesTriggered: RuleResult[];
  sensitivity: SensitivityLevel;
}

export class FusionEngine {
  public static compute(
    phishProbability: number,
    rules: RuleResult[],
    sensitivity: SensitivityLevel = "balanced"
  ): FusionResult {
    const criticalRules = rules.filter(r => r.triggered && r.severity === "critical");
    const warningRules = rules.filter(r => r.triggered && r.severity === "warning");

    // Compute combined rule penalty multiplier
    let ruleMultiplier = 1.0;
    for (const r of [...criticalRules, ...warningRules]) {
      ruleMultiplier *= r.penaltyMultiplier;
    }

    // Base score from ML model
    const baseTrust = 100.0 * (1.0 - phishProbability);

    // Apply rule multipliers
    let rawScore = baseTrust * ruleMultiplier;

    // Hard rules with 0.0 multiplier force 0 score
    if (criticalRules.some(r => r.penaltyMultiplier === 0.0)) {
      rawScore = 0.0;
    }

    const trustScore = Math.max(0, Math.min(100, Math.round(rawScore)));

    // Assign verdict based on sensitivity thresholds
    let verdict: Verdict;
    if (sensitivity === "strict") {
      if (trustScore >= 85) verdict = "Safe";
      else if (trustScore >= 65) verdict = "Caution";
      else if (trustScore >= 45) verdict = "Suspicious";
      else verdict = "Dangerous";
    } else if (sensitivity === "relaxed") {
      if (trustScore >= 65) verdict = "Safe";
      else if (trustScore >= 45) verdict = "Caution";
      else if (trustScore >= 25) verdict = "Suspicious";
      else verdict = "Dangerous";
    } else {
      // Balanced (default)
      if (trustScore >= 75) verdict = "Safe";
      else if (trustScore >= 55) verdict = "Caution";
      else if (trustScore >= 35) verdict = "Suspicious";
      else verdict = "Dangerous";
    }

    // Any critical rule automatically escalates to Dangerous regardless of sensitivity
    if (criticalRules.length > 0 && verdict !== "Dangerous") {
      verdict = "Dangerous";
    }

    return {
      trustScore,
      verdict,
      calibratedPhishProbability: Number(phishProbability.toFixed(4)),
      ruleMultiplier: Number(ruleMultiplier.toFixed(4)),
      criticalRulesTriggered: criticalRules,
      warningRulesTriggered: warningRules,
      sensitivity
    };
  }
}
