import { describe, it, expect } from "vitest";
import { TreeEvaluator, ModelBundle } from "../src/engine/tree-evaluator";
import { ShapExplainer } from "../src/engine/shap-explainer";
import { RuleLayer } from "../src/engine/rule-layer";
import { FusionEngine } from "../src/engine/fusion";
import { ReasonCatalog } from "../src/engine/reason-catalog";
import bundledModel from "../src/engine/bundled-model.json";

describe("TrustLens Inference Engine & Decision Pipeline", () => {
  const model = bundledModel as ModelBundle;
  const evaluator = new TreeEvaluator(model);
  const explainer = new ShapExplainer(model);

  it("verifies bundled model integrity and schema", () => {
    expect(model.model_version).toBe("1.0.0");
    expect(model.feature_count).toBe(44);
    expect(model.trees.length).toBeGreaterThan(10);
    expect(model.calibrator.type).toBe("isotonic");
    expect(model.signature).toBeDefined();
    expect(model.sha256).toBeDefined();
  });

  it("evaluates benign sample as low risk with high trust score", () => {
    // Construct benign feature vector (Tranco top-10k, same-origin, clean HTTPS)
    const benignFeatures = Array(44).fill(0.0);
    benignFeatures[0] = 30.0;  // url_length
    benignFeatures[1] = 10.0;  // domain_length
    benignFeatures[15] = 10.0; // min_typosquat_dist
    benignFeatures[16] = 1.0;  // has_password_input
    benignFeatures[17] = 1.0;  // has_email_input
    benignFeatures[39] = 1.0;  // is_https
    benignFeatures[42] = 1.0;  // is_tranco_top_10k

    const { rawMargin, probability } = evaluator.predict(benignFeatures);
    expect(probability).toBeLessThan(0.15);

    const rules = RuleLayer.evaluate(benignFeatures, "https://google.com/login");
    const fusion = FusionEngine.compute(probability, rules, "balanced");

    expect(fusion.verdict).toBe("Safe");
    expect(fusion.trustScore).toBeGreaterThanOrEqual(80);
  });

  it("evaluates malicious credential harvest as Dangerous", () => {
    // Construct malicious phishing vector
    const phishFeatures = Array(44).fill(0.0);
    phishFeatures[0] = 75.0;   // url_length
    phishFeatures[1] = 32.0;   // domain_length
    phishFeatures[2] = 2.0;    // subdomain_count
    phishFeatures[10] = 1.0;   // suspicious_tld (.xyz)
    phishFeatures[13] = 1.0;   // brand_in_subdomain ("paypal")
    phishFeatures[15] = 1.0;   // min_typosquat_dist
    phishFeatures[16] = 1.0;   // has_password_input
    phishFeatures[25] = 1.0;   // title_brand_mismatch
    phishFeatures[31] = 1.0;   // form_action_cross_origin
    phishFeatures[34] = 1.0;   // credential_cross_post
    phishFeatures[39] = 1.0;   // is_https

    const { rawMargin, probability } = evaluator.predict(phishFeatures);
    expect(probability).toBeGreaterThan(0.70);

    const rules = RuleLayer.evaluate(phishFeatures, "https://paypal-verify.account-update.xyz/login");
    const fusion = FusionEngine.compute(probability, rules, "balanced");

    expect(fusion.verdict).toBe("Dangerous");
    expect(fusion.trustScore).toBeLessThan(35);
    expect(fusion.criticalRulesTriggered.length).toBeGreaterThan(0);

    // Verify TreeSHAP explanation
    const attributions = explainer.explain(phishFeatures);
    expect(attributions.length).toBe(44);
    // Highest contributing feature should have positive shapValue
    expect(attributions[0].shapValue).toBeGreaterThan(0.0);

    // Verify Reason Catalog produces at least 2 plain-language reasons
    const reasons = ReasonCatalog.explain(
      fusion.verdict,
      attributions,
      rules,
      phishFeatures,
      "https://paypal-verify.account-update.xyz/login"
    );

    expect(reasons.length).toBeGreaterThanOrEqual(2);
    for (const r of reasons) {
      expect(r.title).toBeDefined();
      expect(r.plainText).toBeDefined();
      expect(r.evidence).toBeDefined();
      expect(r.whyItMatters).toBeDefined();
      expect(["critical", "warning", "info"]).toContain(r.severity);
    }
  });

  it("handles missing features gracefully at Stage 1", () => {
    // Missing DOM features (represented by -1.0)
    const stage1Features = Array(44).fill(0.0);
    stage1Features[0] = 50.0;
    stage1Features[1] = 20.0;
    for (let i = 16; i <= 35; i++) {
      stage1Features[i] = -1.0; // missing
    }

    const { rawMargin, probability } = evaluator.predict(stage1Features);
    expect(isNaN(rawMargin)).toBe(false);
    expect(isNaN(probability)).toBe(false);
    expect(probability).toBeGreaterThanOrEqual(0.0);
    expect(probability).toBeLessThanOrEqual(1.0);
  });
});
