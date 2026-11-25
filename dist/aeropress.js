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

const storageKey = "coffee-tuner-aeropress-v1";
const byId = (id) => document.getElementById(id);
const roastSelect = byId("roast");
const servings = Array.from(document.querySelectorAll('input[name="servings"]'));
const { renderSchedule, resetTimer } = setupBrewTimer();

function render() {
  const count = Number(servings.find((input) => input.checked).value);
  const roast = roasts[roastSelect.value];
  byId("temperature").firstChild.nodeValue = roast.temperature + " ";
  byId("temperature-note").textContent = t(roast.note);
  byId("ratio").textContent = "1:" + formatNumber(200 / 11);
  byId("batch-detail").textContent = t(count === 1 ? "{dose} g coffee · {count} serving" : "{dose} g coffee · {count} servings", {
    dose: formatNumber(11 * count), count,
  });
  const batchNote = byId("batch-note");
  batchNote.hidden = count === 1;
  batchNote.textContent = t("Use {dose} g coffee and {water} g water per cup. Run the schedule {count} times.", { dose: 11, water: 200, count });
  renderSchedule(stages);
}

function update() {
  resetTimer();
  render();
  try {
    localStorage.setItem(storageKey, JSON.stringify({
      roast: roastSelect.value,
      servings: servings.find((input) => input.checked).value,
    }));
  } catch {
    // Settings still work if storage is unavailable.
  }
}

try {
  const saved = JSON.parse(localStorage.getItem(storageKey));
  if (saved && Object.hasOwn(roasts, saved.roast)) roastSelect.value = saved.roast;
  const savedServing = servings.find((input) => input.value === saved?.servings);
  if (savedServing) savedServing.checked = true;
} catch {
  // Use the defaults in the markup if saved settings are unavailable.
}

roastSelect.addEventListener("change", update);
for (const input of servings) input.addEventListener("change", update);
byId("reset").addEventListener("click", () => {
  roastSelect.value = "light";
  servings[0].checked = true;
  update();
});

setupBrewSettings();
initializeLanguage(render);
