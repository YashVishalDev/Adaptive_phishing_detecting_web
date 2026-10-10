/**
 * Hand-Rolled JSON Tree-Ensemble Evaluator in Pure TypeScript.
 * Sub-2ms p95 latency, missing-value tolerant, zero WASM/C++ runtime overhead.
 */

export interface TreeNode {
  is_leaf: boolean;
  value?: number;
  feature?: number;
  threshold?: number;
  left?: number;
  right?: number;
  default_left?: boolean;
}

export interface SerializedTree {
  nodes: TreeNode[];
}

export interface IsotonicCalibrator {
  type: "isotonic";
  x_thresholds: number[];
  y_values: number[];
}

export interface ModelBundle {
  model_version: string;
  feature_names: string[];
  feature_count: number;
  tree_count: number;
  trees: SerializedTree[];
  base_score: number;
  calibrator: IsotonicCalibrator;
  signature?: string;
  sha256?: string;
  metrics?: {
    roc_auc: number;
    pr_auc: number;
    recall_at_0_5_fpr: number;
  };
}

export class TreeEvaluator {
  private bundle: ModelBundle;

  constructor(bundle: ModelBundle) {
    this.bundle = bundle;
  }

  /**
   * Computes raw logit margin score across all trees in the ensemble.
   */
  public predictRaw(features: number[]): number {
    let margin = this.bundle.base_score || 0.0;

    for (const tree of this.bundle.trees) {
      let nodeIdx = 0;
      const nodes = tree.nodes;

      while (nodeIdx < nodes.length) {
        const node = nodes[nodeIdx];
        if (node.is_leaf) {
          margin += node.value || 0.0;
          break;
        }

        const featureIdx = node.feature!;
        const threshold = node.threshold!;
        const val = features[featureIdx];

        // Missing value fallback (-1.0 or NaN or null)
        if (val === undefined || val === null || isNaN(val) || val === -1.0) {
          nodeIdx = node.default_left ? node.left! : node.right!;
        } else if (val <= threshold) {
          nodeIdx = node.left!;
        } else {
          nodeIdx = node.right!;
        }
      }
    }

    return margin;
  }

  /**
   * Evaluates isotonic probability calibration mapping raw margin to [0, 1].
   */
  public calibrateProbability(rawMargin: number): number {
    // Standard logistic sigmoid to obtain uncalibrated probability
    const rawProb = 1.0 / (1.0 + Math.exp(-rawMargin));

    const calib = this.bundle.calibrator;
    if (!calib || calib.type !== "isotonic" || !calib.x_thresholds.length) {
      return rawProb;
    }

    const xs = calib.x_thresholds;
    const ys = calib.y_values;

    if (rawProb <= xs[0]) return ys[0];
    if (rawProb >= xs[xs.length - 1]) return ys[ys.length - 1];

    // Binary search for interval
    let low = 0;
    let high = xs.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (xs[mid] <= rawProb) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    const i = Math.max(0, high);
    const x0 = xs[i];
    const x1 = xs[Math.min(i + 1, xs.length - 1)];
    const y0 = ys[i];
    const y1 = ys[Math.min(i + 1, ys.length - 1)];

    if (x1 === x0) return y0;

    // Piecewise linear interpolation
    const t = (rawProb - x0) / (x1 - x0);
    const calibrated = y0 + t * (y1 - y0);
    return Math.max(0.0, Math.min(1.0, calibrated));
  }

  /**
   * Returns calibrated phishing probability P(phishing | features).
   */
  public predict(features: number[]): { rawMargin: number; probability: number } {
    const rawMargin = this.predictRaw(features);
    const probability = this.calibrateProbability(rawMargin);
    return { rawMargin, probability };
  }
}
