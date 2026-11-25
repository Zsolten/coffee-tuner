import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateYieldTarget,
  detectOscillation,
  espressoTemperatureGuide,
  nextAdjustment,
  resolveShotFlow,
  starterYieldForRoast,
} from "../dist/espresso-guide.js";
import { hungarian } from "../dist/hungarian.js";

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
  assert.equal(nextAdjustment("balanced", "fast").change, "keep");
});

test("fast + bitter checks puck prep at normal ratios unless dark roast or long ratio", () => {
  assert.equal(nextAdjustment("bitter", "fast", { roast: "medium", ratio: 2.0 }).change, "prep");
  assert.equal(nextAdjustment("bitter", "fast", { roast: "light", ratio: 2.2 }).change, "prep");
  assert.equal(nextAdjustment("bitter", "fast", { roast: "dark", ratio: 1.8 }).change, "shorter");
  assert.equal(nextAdjustment("bitter", "fast", { roast: "medium", ratio: 2.4 }).change, "shorter");
});

test("ratio ceiling and floor guardrails stop runaway yield loops", () => {
  assert.equal(nextAdjustment("sour", "steady", { roast: "medium", ratio: 2.6 }).change, "finer");
  assert.equal(nextAdjustment("sour", "steady", { roast: "light", ratio: 2.6 }).change, "longer");
  assert.equal(nextAdjustment("sour", "steady", { roast: "light", ratio: 3.3 }).change, "finer");

  assert.equal(nextAdjustment("bitter", "steady", { roast: "medium", ratio: 1.5 }).change, "coarser");
  assert.equal(nextAdjustment("bitter", "steady", { roast: "dark", ratio: 1.6 }).change, "shorter");
  assert.equal(nextAdjustment("bitter", "steady", { roast: "dark", ratio: 1.35 }).change, "coarser");

  assert.equal(nextAdjustment("dry", "steady", { roast: "medium", ratio: 2.5 }).change, "shorter");
  assert.equal(nextAdjustment("thin", "fast", { roast: "medium", ratio: 2.0 }).change, "finer");
  assert.equal(nextAdjustment("thin", "steady", { roast: "medium", ratio: 1.5 }).change, "finer");
  assert.equal(nextAdjustment("heavy", "steady", { roast: "medium", ratio: 2.6 }).change, "coarser");
});

test("body and yield targets align with 0.5 g UI steppers", () => {
  assert.equal(nextAdjustment("thin", "steady").change, "shorter");
  assert.equal(nextAdjustment("heavy", "steady").change, "longer");
  assert.equal(calculateYieldTarget(36, "longer"), 40);
  assert.equal(calculateYieldTarget(36, "shorter"), 32);
  assert.equal(calculateYieldTarget(45, "longer"), 50);
  assert.equal(calculateYieldTarget(45, "shorter"), 40);
  assert.equal(starterYieldForRoast(18, "dark"), 30.5);
  assert.equal(starterYieldForRoast(18, "medium"), 36);
  assert.equal(starterYieldForRoast(18, "light"), 45);
});

test("oscillation detector bisects yield and grind overshoots", () => {
  const yieldFlip = detectOscillation(
    { taste: "sour", change: "longer", prevYield: 36, appliedYield: 40 },
    "bitter",
    "shorter",
  );
  assert.equal(yieldFlip.midpoint, 38);

  const grindFlip = detectOscillation(
    { taste: "sour", change: "finer" },
    "sour",
    "coarser",
  );
  assert.ok(grindFlip.message.includes("grind"));
  assert.equal(detectOscillation({ taste: "sour", change: "longer" }, "sour", "longer"), null);
});

test("espresso temperature guidance follows roast, taste and steady flow", () => {
  assert.equal(espressoTemperatureGuide("light", 93, "sour", "steady").target, 94);
  assert.equal(espressoTemperatureGuide("dark", 91, "bitter", "steady").target, 90);
  assert.equal(espressoTemperatureGuide("medium", 92.5, "sour", "steady").target, 93.5);
  assert.equal(espressoTemperatureGuide("medium", 94, "sour", "steady").target, undefined);
  assert.equal(espressoTemperatureGuide("dark", 88, "bitter", "steady").target, undefined);
  assert.equal(espressoTemperatureGuide("light", 93, "sour", "uneven").target, undefined);
  assert.equal(espressoTemperatureGuide("light", 94, "balanced", "steady").target, undefined);
  assert.equal(espressoTemperatureGuide("medium", NaN, "sour", "steady").target, undefined);
});

test("shot time adapts to roast and ratio when flow is automatic", () => {
  const diagnose = (taste, seconds, flow = "auto", context = {}) =>
    nextAdjustment(taste, resolveShotFlow(flow, seconds, context), context).change;

  assert.equal(diagnose("sour", 15), "finer");
  assert.equal(diagnose("bitter", 15), "prep");
  assert.equal(diagnose("bitter", 15, "auto", { roast: "dark", ratio: 1.8 }), "shorter");
  assert.equal(diagnose("bitter", 50), "coarser");
  assert.equal(diagnose("sour", 50), "coarser");
  assert.equal(diagnose("sour", 44, "auto", { roast: "light", ratio: 2.5 }), "longer");
  assert.equal(diagnose("sour", 52, "auto", { roast: "light", ratio: 2.5 }), "coarser");
  assert.equal(diagnose("balanced", 15), "keep");
  assert.equal(diagnose("balanced", 50), "keep");
  assert.equal(diagnose("sour", 50, "uneven"), "prep");
  assert.equal(diagnose("sour", 50, "steady"), "longer");
  assert.equal(diagnose("sour", 20), "longer");
  assert.equal(diagnose("sour", 40), "longer");
  assert.equal(diagnose("sour", NaN), "longer");
  assert.equal(diagnose("sour", 181), "longer");
});

test("all context-aware espresso recommendations have Hungarian translations", () => {
  for (const roast of ["dark", "medium", "light"]) {
    for (const ratio of [1.3, 1.8, 2.1, 2.6, 3.4]) {
      for (const taste of ["sour", "bitter", "dry", "mixed", "thin", "heavy", "balanced"]) {
        for (const flow of ["fast", "steady", "slow", "uneven"]) {
          const { change, ...copy } = nextAdjustment(taste, flow, { roast, ratio });
          for (const message of Object.values(copy)) {
            assert.ok(Object.hasOwn(hungarian, message), message);
          }
        }
      }
    }
  }
});