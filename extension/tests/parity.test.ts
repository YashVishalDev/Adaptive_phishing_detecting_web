import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { extractAllFeatures } from "../src/features/feature-extractor";
import { FEATURE_NAMES } from "../src/features/schema";

interface GoldenVectorCase {
  id: string;
  url: string;
  html: string | null;
  context: Record<string, any>;
  expected_vector: number[];
}

interface GoldenVectorFile {
  feature_names: string[];
  feature_count: number;
  test_vectors: GoldenVectorCase[];
}

describe("Python <-> TypeScript Feature Parity", () => {
  const goldenPath = path.resolve(__dirname, "../../tests/parity/golden_vectors.json");
  const fileContent = fs.readFileSync(goldenPath, "utf-8");
  const data: GoldenVectorFile = JSON.parse(fileContent);

  it("verifies canonical feature names match exactly in count and order", () => {
    expect(data.feature_names).toEqual(FEATURE_NAMES);
    expect(data.feature_count).toBe(44);
  });

  for (const testCase of data.test_vectors) {
    it(`matches Python golden vector for case: ${testCase.id}`, () => {
      const tsVector = extractAllFeatures(
        testCase.url,
        testCase.html,
        testCase.context
      );

      expect(tsVector.length).toBe(testCase.expected_vector.length);

      for (let i = 0; i < tsVector.length; i++) {
        const featureName = data.feature_names[i];
        const tsVal = tsVector[i];
        const pyVal = testCase.expected_vector[i];

        // Tolerant to floating point rounding (1e-4)
        const diff = Math.abs(tsVal - pyVal);
        if (diff > 0.0001) {
          throw new Error(
            `Parity divergence on case '${testCase.id}' for feature '${featureName}' (index ${i}): Python=${pyVal}, TS=${tsVal}, diff=${diff}`
          );
        }
      }
    });
  }
});
