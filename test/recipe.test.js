import assert from "node:assert/strict";
import test from "node:test";
import { calculateHoffmann, defaultSettings, styles } from "../dist/recipe.js";

function scaleTargets(recipe) {
  return recipe.schedule.filter((stage) => stage.kind === "pour").map((stage) => stage.total);
}

test("Hoffmann's 15 g recipe follows the original weight and time marks", () => {
  const recipe = calculateHoffmann(defaultSettings);
  assert.equal(recipe.water, 250);
  assert.equal(recipe.ratio, "16.7");
  assert.equal(recipe.temperature, "100 °C");
  assert.equal(recipe.finish.start, 180);
  assert.deepEqual(scaleTargets(recipe), [50, 100, 150, 200, 250]);
  assert.deepEqual(recipe.schedule.map(({ start, end }) => [start, end]), [
    [0, 10], [10, 15], [15, 45], [45, 60], [60, 70], [70, 80], [80, 90],
    [90, 100], [100, 110], [110, 120], [120, 125], [125, 180], [180, undefined],
  ]);
});

test("four servings can be four one-cup brews or one scaled batch", () => {
  const settings = { ...defaultSettings, servings: 4, dose: 60 };
  const separate = calculateHoffmann(settings);
  assert.equal(separate.brews, 4);
  assert.equal(separate.dosePerBrew, 15);
  assert.equal(separate.water, 1000);
  assert.deepEqual(scaleTargets(separate), [50, 100, 150, 200, 250]);
  const combined = calculateHoffmann({ ...settings, batch: "combined" });
  assert.equal(combined.brews, 1);
  assert.equal(combined.water, 1000);
  assert.deepEqual(scaleTargets(combined), [200, 400, 600, 800, 1000]);
  assert.ok(combined.finish.start > separate.finish.start);
});

test("the optional dose, roast, cup style and stirring settings affect the recipe", () => {
  const recipe = calculateHoffmann({ ...defaultSettings, dose: 18, roast: "dark", bloomMethod: "stir" });
  assert.deepEqual(scaleTargets(recipe), [60, 120, 180, 240, 300]);
  assert.equal(recipe.temperature, "80–85 °C");
  assert.equal(recipe.schedule[1].label, "Stir the bloom");
  assert.equal(calculateHoffmann({ ...defaultSettings, style: "full" }).water, 233);
  assert.equal(calculateHoffmann({ ...defaultSettings, style: "bright" }).water, 263);
});

test("Hoffmann schedule stays continuous across supported doses and batch modes", () => {
  for (const style of Object.keys(styles)) {
    for (let servings = 1; servings <= 4; servings++) {
      for (const batch of ["separate", "combined"]) {
        for (let tenths = 50; tenths <= 600; tenths++) {
          const recipe = calculateHoffmann({ ...defaultSettings, dose: tenths / 10, servings, style, batch });
          const targets = scaleTargets(recipe);
          assert.equal(targets.at(-1) * recipe.brews, recipe.water);
          let prior = 0;
          for (const target of targets) {
            assert.ok(target >= prior);
            prior = target;
          }
          for (let step = 1; step < recipe.schedule.length; step++) {
            assert.equal(recipe.schedule[step].start, recipe.schedule[step - 1].end);
          }
        }
      }
    }
  }
});
