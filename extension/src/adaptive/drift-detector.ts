/**
 * Population Stability Index (PSI) Drift Detector for TrustLens.
 * Evaluates feature and score distribution shift over rolling client navigations.
 */

export interface DriftReport {
  psiScore: number;
  sampleCount: number;
  isDriftDetected: boolean;
  status: "stable" | "moderate_shift" | "significant_drift";
  message: string;
}

export class DriftDetector {
  private rollingScores: number[] = [];
  private readonly WINDOW_SIZE: number = 100;
  private readonly BUCKET_COUNT: number = 5;

  // 5 score intervals: [0.0-0.2, 0.2-0.4, 0.4-0.6, 0.6-0.8, 0.8-1.0]
  // Baseline distribution from balanced training set (roughly 50% benign, 50% phish)
  private readonly BASELINE_DIST: number[] = [0.45, 0.05, 0.05, 0.05, 0.40];

  public recordScore(probability: number): void {
    const p = Math.max(0.0, Math.min(1.0, probability));
    this.rollingScores.push(p);
    if (this.rollingScores.length > this.WINDOW_SIZE) {
      this.rollingScores.shift();
    }
  }

  /**
   * Computes Population Stability Index over current rolling window.
   */
  public evaluateDrift(): DriftReport {
    const n = this.rollingScores.length;
    if (n < 20) {
      return {
        psiScore: 0.0,
        sampleCount: n,
        isDriftDetected: false,
        status: "stable",
        message: "Insufficient sample volume for drift computation (requires >= 20 navigations)."
      };
    }

    // Bucket rolling scores
    const observedCounts = new Array(this.BUCKET_COUNT).fill(0);
    for (const score of this.rollingScores) {
      let bucket = Math.floor(score * this.BUCKET_COUNT);
      if (bucket >= this.BUCKET_COUNT) bucket = this.BUCKET_COUNT - 1;
      observedCounts[bucket]++;
    }

    // Apply Laplace smoothing
    let psi = 0.0;
    const totalObs = n + this.BUCKET_COUNT;

    for (let b = 0; b < this.BUCKET_COUNT; b++) {
      const q = (observedCounts[b] + 1) / totalObs;
      const p = this.BASELINE_DIST[b];
      psi += (q - p) * Math.log(q / p);
    }

    const psiScore = Number(Math.max(0, psi).toFixed(4));
    let status: "stable" | "moderate_shift" | "significant_drift" = "stable";
    let isDriftDetected = false;
    let message = "Feature and score distributions are aligned with training baseline.";

    if (psiScore >= 0.25) {
      status = "significant_drift";
      isDriftDetected = true;
      message = "Significant distribution shift detected. New signed threat model update recommended.";
    } else if (psiScore >= 0.10) {
      status = "moderate_shift";
      message = "Moderate distribution drift observed; model predictions remain stable.";
    }

    return {
      psiScore,
      sampleCount: n,
      isDriftDetected,
      status,
      message
    };
  }
}
