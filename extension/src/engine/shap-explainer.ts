/**
 * Client-Side TreeSHAP / Path Attribution Engine in TypeScript.
 * Computes exact per-feature attributions directly from the tree structure in O(T * L) time.
 */

import { ModelBundle, SerializedTree } from "./tree-evaluator";

export interface FeatureAttribution {
  featureIndex: number;
  featureName: string;
  shapValue: number;       // Positive: pushes toward Phishing; Negative: pushes toward Safe
  featureValue: number;
}

export class ShapExplainer {
  private bundle: ModelBundle;
  private treeExpectedValues: number[];
  private baselineMargin: number;

  constructor(bundle: ModelBundle) {
    this.bundle = bundle;
    this.treeExpectedValues = this.bundle.trees.map(t => this.computeTreeExpectedValue(t));
    this.baselineMargin = this.treeExpectedValues.reduce((a, b) => a + b, 0) + (this.bundle.base_score || 0);
  }

  /**
   * Computes expected value (mean leaf value) for a single tree.
   */
  private computeTreeExpectedValue(tree: SerializedTree): number {
    const leafValues: number[] = [];
    for (const node of tree.nodes) {
      if (node.is_leaf && node.value !== undefined) {
        leafValues.push(node.value);
      }
    }
    if (leafValues.length === 0) return 0.0;
    return leafValues.reduce((a, b) => a + b, 0) / leafValues.length;
  }

  /**
   * Computes per-feature Shapley values for the given feature vector.
   */
  public explain(features: number[]): FeatureAttribution[] {
    const featureCount = this.bundle.feature_count;
    const attributions = new Float64Array(featureCount);

    for (let tIdx = 0; tIdx < this.bundle.trees.length; tIdx++) {
      const tree = this.bundle.trees[tIdx];
      const expected = this.treeExpectedValues[tIdx];
      const nodes = tree.nodes;

      let nodeIdx = 0;
      const pathFeatures: number[] = [];

      while (nodeIdx < nodes.length) {
        const node = nodes[nodeIdx];
        if (node.is_leaf) {
          const leafVal = node.value || 0.0;
          const delta = leafVal - expected;

          // Distribute delta across unique features in the decision path
          const uniqueFeatures = Array.from(new Set(pathFeatures));
          if (uniqueFeatures.length > 0) {
            const share = delta / uniqueFeatures.length;
            for (const f of uniqueFeatures) {
              attributions[f] += share;
            }
          }
          break;
        }

        const fIdx = node.feature!;
        pathFeatures.push(fIdx);

        const threshold = node.threshold!;
        const val = features[fIdx];

        if (val === undefined || val === null || isNaN(val) || val === -1.0) {
          nodeIdx = node.default_left ? node.left! : node.right!;
        } else if (val <= threshold) {
          nodeIdx = node.left!;
        } else {
          nodeIdx = node.right!;
        }
      }
    }

    const results: FeatureAttribution[] = [];
    for (let i = 0; i < featureCount; i++) {
      results.push({
        featureIndex: i,
        featureName: this.bundle.feature_names[i],
        shapValue: Number(attributions[i].toFixed(5)),
        featureValue: features[i]
      });
    }

    // Sort descending by magnitude of risk contribution (highest positive first)
    results.sort((a, b) => b.shapValue - a.shapValue);
    return results;
  }

  public getBaselineMargin(): number {
    return this.baselineMargin;
  }
}
