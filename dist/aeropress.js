import { setupBrewSettings } from "./brew-settings.js";
import { setupBrewTimer } from "./brew-timer.js";
import { formatNumber, initializeLanguage, t } from "./language.js";

const roasts = {
  light: { temperature: "100", note: "Use water just off the boil and grind on the finer side of medium." },
  medium: { temperature: "90–95", note: "Start with a medium grind and adjust to taste." },
  dark: { temperature: "85–90", note: "Try a slightly coarser grind for darker roasts." },
};
const stages = [
  { start: 0, kind: "pour", label: "Pour and seal", note: "Wet all the grounds with the full pour. Start the timer, then insert the plunger about 1 cm to hold the water in the brewer.", total: 200 },
  { start: 120, kind: "swirl", label: "Swirl gently", note: "Hold the brewer and plunger together as you swirl, then let it settle for 30 seconds." },
  { start: 150, kind: "press", label: "Press gently", note: "Push the plunger down slowly and evenly. Allow about 30 seconds." },
];

const recipes = {
  "happy": {
    "dose": 13,
    "water": 180,
    "temp": "90",
    "author": "Sigit Tri",
    "slug": "13g-that-makes-you-happy",
    "setup": "Use a coarse grind and set up the brewer inverted with a paper filter.",
    "stages": [
      {
        "start": 0,
        "kind": "pour",
        "label": "Bloom and stir",
        "note": "Add 30 g of water and stir five times.",
        "total": 30
      },
      {
        "start": 30,
        "kind": "pour",
        "label": "Fill and steep",
        "note": "Top up to 180 g and stir five more times. Fit the filter cap.",
        "total": 180
      },
      {
        "start": 90,
        "kind": "pour",
        "label": "Turn and press",
        "note": "Turn onto a sturdy mug and press slowly for one minute."
      },
      {
        "start": 150,
        "kind": "pour",
        "label": "Rest before serving",
        "note": "Let the cup rest for 20–30 seconds."
      }
    ]
  },
  "sweet": {
    "dose": 24,
    "water": 240,
    "temp": "92",
    "author": "Damaring Kalpika",
    "slug": "for-the-sweetest-cup",
    "setup": "Use a medium grind and the inverted brewer. Wet two paper filters and warm the mug.",
    "stages": [
      {
        "start": 0,
        "kind": "pour",
        "label": "Wet the grounds",
        "note": "Pour 60 g and stir gently 15–20 times.",
        "total": 60
      },
      {
        "start": 30,
        "kind": "pour",
        "label": "Finish pouring",
        "note": "Add 180 g in circles, stir for 10 seconds, then cap.",
        "total": 240
      },
      {
        "start": 60,
        "kind": "pour",
        "label": "Turn and press",
        "note": "Turn onto the warm mug and press gradually for one minute."
      },
      {
        "start": 120,
        "kind": "pour",
        "label": "Dilute to taste",
        "note": "Add water until the drink weighs 240 g (roughly 48 g extra per cup), then stir."
      }
    ]
  }
};
recipes.hoffmann = { dose: 11, water: 200, author: "James Hoffmann", slug: "james-hoffmann-aeropress-recipe", setup: "Set the AeroPress upright on a sturdy mug with a paper filter and add the ground coffee. Start the timer after pouring.", stages };

const storageKey = "coffee-tuner-aeropress-v1";
const byId = (id) => document.getElementById(id);
const roastSelect = byId("roast");
const method = byId("aero-method");
const servings = Array.from(document.querySelectorAll('input[name="servings"]'));
const { renderSchedule, resetTimer } = setupBrewTimer();

function render() {
  const count = Number(servings.find((input) => input.checked).value);
  const recipe = recipes[method.value];
  roastSelect.closest(".control").hidden = Boolean(recipe.temp);
  byId("water").firstChild.nodeValue = formatNumber(recipe.water * count) + " ";
  byId("plan-note").textContent = t(recipe.setup);
  const source = byId("recipe-source");
  source.href = "https://aeroprecipe.com/recipes/" + recipe.slug;
  source.textContent = recipe.author + " · AeroPrecipe";
  const roast = roasts[roastSelect.value];
  byId("temperature").firstChild.nodeValue = (recipe.temp ?? roast.temperature) + " ";
  byId("temperature-note").textContent = recipe.temp ? recipe.author : t(roast.note);
  byId("ratio").textContent = "1:" + formatNumber(recipe.water / recipe.dose);
  byId("batch-detail").textContent = t(count === 1 ? "{dose} g coffee · {count} serving" : "{dose} g coffee · {count} servings", {
    dose: formatNumber(recipe.dose * count), count,
  });
  const batchNote = byId("batch-note");
  batchNote.hidden = count === 1;
  batchNote.textContent = t("Use {dose} g coffee and {water} g water per cup. Run the schedule {count} times.", { dose: recipe.dose, water: recipe.water, count });
  renderSchedule(recipe.stages);
}

function update() {
  resetTimer();
  render();
  try {
    localStorage.setItem(storageKey, JSON.stringify({
      recipe: method.value, roast: roastSelect.value,
      servings: servings.find((input) => input.checked).value,
    }));
  } catch {
    // Settings still work if storage is unavailable.
  }
}

try {
  const saved = JSON.parse(localStorage.getItem(storageKey));
  if (saved && Object.hasOwn(recipes, saved.recipe)) method.value = saved.recipe;
  if (saved && Object.hasOwn(roasts, saved.roast)) roastSelect.value = saved.roast;
  const savedServing = servings.find((input) => input.value === saved?.servings);
  if (savedServing) savedServing.checked = true;
} catch {
  // Use the defaults in the markup if saved settings are unavailable.
}

method.addEventListener("change", update);
roastSelect.addEventListener("change", update);
for (const input of servings) input.addEventListener("change", update);
byId("reset").addEventListener("click", () => {
  method.value = "hoffmann";
  roastSelect.value = "medium";
  servings[0].checked = true;
  update();
});

setupBrewSettings();
initializeLanguage(render);
