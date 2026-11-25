import assert from "node:assert/strict";
import test from "node:test";
import { calculateYieldTarget, espressoTemperatureGuide, nextAdjustment, resolveShotFlow } from "../dist/espresso-guide.js";

test("taste and flow lead to different next steps for a sour shot", () => {
  assert.equal(nextAdjustment("sour", "fast").change, "finer");
  assert.equal(nextAdjustment("sour", "steady").change, "longer");
  assert.equal(nextAdjustment("sour", "slow").change, "coarser");
  assert.equal(nextAdjustment("sour", "uneven").change, "prep");
});

test("bitterness, dryness, and mixed taste have distinct diagnoses", () => {
  assert.equal(nextAdjustment("bitter", "steady").change, "shorter");
  assert.equal(nextAdjustment("dry", "steady").change, "prep");
  assert.equal(nextAdjustment("mixed", "fast").change, "prep");
  assert.equal(nextAdjustment("balanced", "slow").change, "keep");
});

test("body and strength adjustments work from the measured yield", () => {
  assert.equal(nextAdjustment("thin", "steady").change, "shorter");
  assert.equal(nextAdjustment("heavy", "steady").change, "longer");
  assert.equal(calculateYieldTarget(36, "longer"), 39.6);
  assert.equal(calculateYieldTarget(36, "shorter"), 32.4);
  assert.equal(calculateYieldTarget(43.6, "longer"), 48);
});

test("espresso temperature guidance follows roast, taste and steady flow", () => {
  assert.equal(espressoTemperatureGuide("light", 93, "sour", "steady").target, 94);
  assert.equal(espressoTemperatureGuide("dark", 93, "bitter", "steady").target, 92);
  assert.equal(espressoTemperatureGuide("medium", 92.5, "sour", "steady").target, 93.5);
  assert.equal(espressoTemperatureGuide("medium", 94, "sour", "steady").target, undefined);
  assert.equal(espressoTemperatureGuide("dark", 88, "bitter", "steady").target, undefined);
  assert.equal(espressoTemperatureGuide("light", 93, "sour", "uneven").target, undefined);
  assert.equal(espressoTemperatureGuide("light", 94, "balanced", "steady").target, undefined);
  assert.equal(espressoTemperatureGuide("medium", NaN, "sour", "steady").target, undefined);
});

test("shot time can guide grind adjustments when flow is unknown", () => {
  const diagnose = (taste, seconds, flow = "auto") =>
    nextAdjustment(taste, resolveShotFlow(flow, seconds)).change;

  assert.equal(diagnose("sour", 15), "finer");
  assert.equal(diagnose("bitter", 15), "shorter");
  assert.equal(diagnose("bitter", 50), "coarser");
  assert.equal(diagnose("sour", 50), "coarser");
  assert.equal(diagnose("balanced", 15), "keep");
  assert.equal(diagnose("balanced", 50), "keep");
  assert.equal(diagnose("sour", 50, "uneven"), "prep");
  assert.equal(diagnose("sour", 50, "steady"), "longer");
  assert.equal(diagnose("sour", 20), "longer");
  assert.equal(diagnose("sour", 40), "longer");
  assert.equal(diagnose("sour", NaN), "longer");
  assert.equal(diagnose("sour", 181), "longer");
});
