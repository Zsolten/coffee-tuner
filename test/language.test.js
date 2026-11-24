import assert from "node:assert/strict";
import test from "node:test";
import { calculateHoffmann, defaultSettings, styles } from "../dist/recipe.js";
import { nextAdjustment, preInfusionGuide } from "../dist/espresso-guide.js";
import { hungarian } from "../dist/hungarian.js";
import { translateMessage } from "../dist/language.js";

test("translated messages preserve amounts and fall back to English", () => {
  const message = "Keep {dose} g in and try about {yield} g out.";
  assert.equal(translateMessage("hu", message, { dose: 18, yield: "39,6" }),
    "Maradj 18 g őrleménynél, és célozz kb. 39,6 g italt.");
  assert.equal(translateMessage("en", message, { dose: 18, yield: 39.6 }),
    "Keep 18 g in and try about 39.6 g out.");
  assert.equal(translateMessage("hu", "g"), "g");
});

test("all V60 schedules and roast notes have Hungarian translations", () => {
  for (const roast of ["light", "medium-light", "medium", "medium-dark", "dark"]) {
    for (const bloomMethod of ["stir", "swirl"]) {
      const recipe = calculateHoffmann({ ...defaultSettings, roast, bloomMethod });
      assert.ok(Object.hasOwn(hungarian, recipe.temperatureNote), recipe.temperatureNote);
      for (const stage of recipe.schedule) {
        assert.ok(Object.hasOwn(hungarian, stage.label), stage.label);
        if (stage.note) assert.ok(Object.hasOwn(hungarian, stage.note), stage.note);
      }
    }
  }
  for (const style of Object.values(styles)) {
    assert.ok(Object.hasOwn(hungarian, style.description), style.description);
  }
});

test("all espresso decisions and pre-infusion durations have Hungarian translations", () => {
  for (const taste of ["sour", "bitter", "dry", "mixed", "thin", "heavy", "balanced"]) {
    for (const flow of ["fast", "steady", "slow", "uneven"]) {
      const { change, ...copy } = nextAdjustment(taste, flow);
      for (const message of Object.values(copy)) {
        assert.ok(Object.hasOwn(hungarian, message), message);
      }
    }
  }
  for (let seconds = 0; seconds <= 20; seconds++) {
    const { max, ...copy } = preInfusionGuide(seconds);
    for (const message of Object.values(copy)) assert.ok(Object.hasOwn(hungarian, message), message);
  }
});
