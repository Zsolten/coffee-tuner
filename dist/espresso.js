import { calculateYieldTarget, espressoTemperatureGuide, nextAdjustment, resolveShotFlow } from "./espresso-guide.js";
import { formatNumber, initializeLanguage, t } from "./language.js";

const byId = (id) => document.getElementById(id);
const dose = byId("shot-dose");
const yieldInCup = byId("shot-yield");
const roast = byId("espresso-roast");
const temperature = byId("shot-temperature");
const shotTime = byId("shot-time");
const stepButtons = document.querySelectorAll("[data-step-target]");

function setText(id, message, values) {
  const element = byId(id);
  const text = t(message, values);
  if (element.textContent !== text) element.textContent = text;
}

function showFieldError(id, valid, message) {
  const error = byId(id);
  error.hidden = valid;
  setText(id, valid ? "" : message);
}

function selected(name) {
  return document.querySelector('input[name="' + name + '"]:checked').value;
}

function renderAdjustment() {
  const taste = selected("taste");
  const observedFlow = selected("flow");
  const timeValid = shotTime.validity.valid;
  const seconds = timeValid ? shotTime.valueAsNumber : NaN;
  const flow = resolveShotFlow(observedFlow, seconds);
  const recommendation = nextAdjustment(taste, flow);
  shotTime.setAttribute("aria-invalid", String(!timeValid));
  showFieldError("shot-time-help", timeValid, "Enter a whole number of seconds from 1 to 180.");
  const timingCue = byId("timing-cue");
  timingCue.hidden = observedFlow !== "auto" || flow === "steady";
  if (!timingCue.hidden) {
    setText("timing-cue", flow === "fast"
      ? "{seconds} s is fast for a conventional espresso."
      : "{seconds} s is slow for a conventional espresso.", { seconds });
  }
  const temperatureValid = temperature.validity.valid;
  temperature.setAttribute("aria-invalid", String(!temperatureValid));
  showFieldError("shot-temperature-help", temperatureValid, "Enter a temperature from 80 to 100 °C, with up to one decimal place.");
  const temperatureGuide = espressoTemperatureGuide(
    roast.value, temperatureValid ? temperature.valueAsNumber : NaN, taste, flow,
  );
  setText("temperature-start", temperatureGuide.note);
  const followUp = byId("temperature-follow-up");
  followUp.hidden = !temperatureGuide.followUp;
  setText("temperature-follow-up", temperatureGuide.followUp || "", {
    temperature: formatNumber(temperatureGuide.target),
  });
  const doseValid = dose.validity.valid;
  const yieldValid = yieldInCup.validity.valid;
  const valid = doseValid && yieldValid;

  dose.setAttribute("aria-invalid", String(!doseValid));
  yieldInCup.setAttribute("aria-invalid", String(!yieldValid));
  showFieldError("weight-help", valid, "Enter a 4–36 g dose and a 4–120 g yield, with up to one decimal place.");

  let detail = recommendation.instruction;
  if (recommendation.change === "longer" || recommendation.change === "shorter") {
    const target = valid ? calculateYieldTarget(yieldInCup.valueAsNumber, recommendation.change) : null;
    detail = valid
      ? t("Keep {dose} g in and try about {yield} g out.", {
        dose: formatNumber(dose.valueAsNumber), yield: formatNumber(target),
      })
      : "Enter the dose and yield above for a suggested target.";
  }

  setText("last-ratio", valid
    ? "{dose} g in · {yield} g out · 1:{ratio}"
    : "Enter your shot weights", {
    dose: formatNumber(dose.valueAsNumber),
    yield: formatNumber(yieldInCup.valueAsNumber),
    ratio: formatNumber(yieldInCup.valueAsNumber / dose.valueAsNumber, 1, 1),
  });
  setText("adjustment-title", recommendation.title);
  setText("adjustment-detail", detail);
  setText("adjustment-why", recommendation.why);
  setText("adjustment-keep", recommendation.keep);
  setText("adjustment-watch", recommendation.watch);
  for (const name of ["taste", "flow"]) byId("mobile-" + name).value = selected(name);
  stepButtons.forEach(button => {
    const field = byId(button.dataset.stepTarget);
    button.disabled = Number(button.dataset.step) < 0 ? field.valueAsNumber <= Number(field.min) : field.valueAsNumber >= Number(field.max);
  });
}

function updateAdjustment() {
  renderAdjustment();
  remember();
}

document.querySelectorAll('input[name="taste"], input[name="flow"]').forEach((input) => {
  input.addEventListener("change", updateAdjustment);
});
dose.addEventListener("input", updateAdjustment);
yieldInCup.addEventListener("input", updateAdjustment);
roast.addEventListener("change", updateAdjustment);
temperature.addEventListener("input", updateAdjustment);
shotTime.addEventListener("input", updateAdjustment);

for (const name of ["taste", "flow"]) {
  byId("mobile-" + name).addEventListener("change", event => {
    document.querySelector('input[name="' + name + '"][value="' + event.target.value + '"]').checked = true;
    updateAdjustment();
  });
}
stepButtons.forEach(button => {
  button.addEventListener("click", () => {
    const field = byId(button.dataset.stepTarget);
    const initial = Number.isFinite(field.valueAsNumber) ? field.valueAsNumber : Number(field.defaultValue || 30);
    field.value = Math.min(Number(field.max), Math.max(Number(field.min), Math.round((initial + Number(button.dataset.step)) * 10) / 10));
    updateAdjustment();
  });
});
const key = "coffee-tuner-espresso-v1";
const fields = [dose, yieldInCup, roast, temperature, shotTime];
const optionalFields = new Set([temperature, shotTime]);
let saved = {};
let lastStored = null;
try {
  lastStored = localStorage.getItem(key);
  saved = JSON.parse(lastStored) || {};
  for (const field of fields) {
    if (saved[field.id] === undefined) continue;
    const initial = field.value;
    field.value = saved[field.id];
    if (!field.validity.valid || (!field.value && !optionalFields.has(field))) field.value = initial;
  }
  // The old "Steady / unsure" option becomes automatic unless a newer selection is saved.
  if (!Object.hasOwn(saved, "shot-time") && saved.flow === "steady") saved.flow = "auto";
  for (const input of document.querySelectorAll('input[type="radio"]')) {
    if (input.value === saved[input.name]) input.checked = true;
  }
} catch { /* Storage is optional. */ }

function remember() {
  try {
    for (const field of fields) {
      if (field.validity.valid && (field.value || optionalFields.has(field))) saved[field.id] = field.value;
    }
    saved.taste = selected("taste");
    saved.flow = selected("flow");
    const next = JSON.stringify(saved);
    if (next === lastStored) return;
    localStorage.setItem(key, next);
    lastStored = next;
  } catch { /* Storage is optional. */ }
}

initializeLanguage(renderAdjustment);
