import assert from "node:assert/strict";
import test from "node:test";
import { calculateYieldTarget, nextAdjustment, preInfusionGuide } from "../dist/espresso-guide.js";

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

test("pre-infusion duration does not imply a guaranteed roast or flavor outcome", () => {
  assert.equal(preInfusionGuide(0).label, "No intentional hold");
  for (let seconds = 1; seconds <= 20; seconds++) {
    assert.equal(preInfusionGuide(seconds).label, "Trial duration");
    assert.match(preInfusionGuide(seconds).detail, /Seconds alone do not predict/);
  }
});
