/**
 * Local Adaptation & Recalibration Layer for TrustLens.
 * Bounded on-device adaptation layer with strict anti-poisoning safeguards.
 */

import { FeedbackRecord } from "./encrypted-store";

export class LocalCalibrator {
  private deltaShift: number = 0.0;
  private readonly MAX_ABS_SHIFT: number = 8.0;      // Hard boundary: max +/- 8 score shift
  private readonly MAX_DAILY_FEEDBACK: number = 5;  // Rate-limit feedback influence

  /**
   * Recalibrates local threshold shift based on historical user feedback.
   */
  public recomputeFromFeedback(records: FeedbackRecord[]): number {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentRecords = records.filter(r => r.timestamp > oneDayAgo).slice(-this.MAX_DAILY_FEEDBACK);

    let shift = 0.0;
    for (const r of recentRecords) {
      if (r.userAction === "false_positive") {
        // User indicates benign site was flagged too harshly: nudge score up slightly
        shift += 1.5;
      } else if (r.userAction === "false_negative") {
        // User indicates dangerous site was missed: nudge score down
        shift -= 2.0;
      }
    }

    // Apply strict anti-poisoning cap
    this.deltaShift = Math.max(-this.MAX_ABS_SHIFT, Math.min(this.MAX_ABS_SHIFT, shift));
    return this.deltaShift;
  }

  /**
   * Applies local calibration shift to an incoming Trust Score.
   */
  public calibrateScore(baseScore: number): number {
    const adjusted = baseScore + this.deltaShift;
    return Math.max(0, Math.min(100, Math.round(adjusted)));
  }

  public getShift(): number {
    return this.deltaShift;
  }
}
