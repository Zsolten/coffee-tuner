import {
  calculateYieldTarget,
  detectOscillation,
  espressoTemperatureGuide,
  nextAdjustment,
  resolveShotFlow,
  roastProfiles,
} from "./espresso-guide.js";
import { formatNumber, initializeLanguage, t } from "./language.js";

const byId = (id) => document.getElementById(id);
const dose = byId("shot-dose");
const yieldInCup = byId("shot-yield");
const roast = byId("espresso-roast");
const temperature = byId("shot-temperature");
const shotTime = byId("shot-time");
const applyYieldButton = byId("apply-yield");
const resetButton = byId("reset-espresso");
const stepButtons = document.querySelectorAll("[data-step-target]");

const key = "coffee-tuner-espresso-v1";
const fields = [dose, yieldInCup, roast, temperature, shotTime];
const optionalFields = new Set([temperature, shotTime]);
let saved = {};
let lastStored = null;
let pendingTargetYield = null;

function setText(id, message, values) {
  const element = byId(id);
  if (!element) return;
  const text = message ? t(message, values) : "";
  if (element.textContent !== text) element.textContent = text;
}

function showFieldError(id, valid, message) {
  const error = byId(id);
  if (!error) return;
  error.hidden = valid;
  setText(id, valid ? "" : message);
}

function selected(name) {
  return document.querySelector('input[name="' + name + '"]:checked').value;
}

function defaultStepStart(field) {
  if (field === temperature) {
    return (roastProfiles[roast.value] ?? roastProfiles.medium).defaultTemp;
  }
  return Number(field.defaultValue || 30);
}

function renderAdjustment() {
  const taste = selected("taste");
  const observedFlow = selected("flow");
  const doseValid = dose.validity.valid;
  const yieldValid = yieldInCup.validity.valid;
  const valid = doseValid && yieldValid;
  const currentRatio = valid ? yieldInCup.valueAsNumber / dose.valueAsNumber : NaN;
  const context = { roast: roast.value, ratio: currentRatio };

  const timeValid = shotTime.validity.valid;
  const hasTime = timeValid && shotTime.value !== "";
  const seconds = hasTime ? shotTime.valueAsNumber : NaN;
  const autoFlow = resolveShotFlow("auto", seconds, context);
  const flow = resolveShotFlow(observedFlow, seconds, context);
  const recommendation = nextAdjustment(taste, flow, context);
  const oscillation = detectOscillation(saved.previousStep, taste, recommendation.change);

  shotTime.setAttribute("aria-invalid", String(!timeValid));
  showFieldError("shot-time-help", timeValid, "Enter a whole number of seconds from 1 to 180.");

  setText(
    "flow-help",
    observedFlow === "auto" && !hasTime
      ? "No shot time entered — assuming a steady flow. Pick the flow you saw if it gushed or choked."
      : "Long pre-infusion or turbo shot? Choose the flow speed you saw.",
  );

  const timingCue = byId("timing-cue");
  if (timingCue) {
    if (observedFlow === "auto" && flow !== "steady") {
      timingCue.hidden = false;
      setText(
        "timing-cue",
        flow === "fast"
          ? "{seconds} s is fast for a conventional espresso."
          : "{seconds} s is slow for this roast and ratio.",
        { seconds },
      );
    } else if (observedFlow === "steady" && hasTime && autoFlow !== "steady") {
      timingCue.hidden = false;
      setText(
        "timing-cue",
        autoFlow === "fast"
          ? "{seconds} s is quite fast — if the stream gushed, choose Fast / gushing instead."
          : "{seconds} s is quite slow — unless you used a long pre-infusion, choose Slow / choking.",
        { seconds },
      );
    } else {
      timingCue.hidden = true;
      setText("timing-cue", "");
    }
  }

  const temperatureValid = temperature.validity.valid;
  const hasTemperature = temperatureValid && temperature.value !== "";
  temperature.setAttribute("aria-invalid", String(!temperatureValid));
  showFieldError(
    "shot-temperature-help",
    temperatureValid,
    "Enter a temperature from 80 to 100 °C, with up to one decimal place.",
  );
  const temperatureGuide = espressoTemperatureGuide(
    roast.value,
    hasTemperature ? temperature.valueAsNumber : NaN,
    taste,
    flow,
  );
  setText("temperature-start", temperatureGuide.note);
  const followUp = byId("temperature-follow-up");
  followUp.hidden = !temperatureGuide.followUp;
  setText("temperature-follow-up", temperatureGuide.followUp || "", {
    temperature: temperatureGuide.target === undefined ? "" : formatNumber(temperatureGuide.target),
  });

  dose.setAttribute("aria-invalid", String(!doseValid));
  yieldInCup.setAttribute("aria-invalid", String(!yieldValid));
  showFieldError("weight-help", valid, "Enter a 4–36 g dose and a 4–120 g yield, with up to one decimal place.");

  pendingTargetYield = null;
  if (recommendation.change === "longer" || recommendation.change === "shorter") {
    const target = valid
      ? (oscillation?.midpoint ?? calculateYieldTarget(yieldInCup.valueAsNumber, recommendation.change))
      : null;
    pendingTargetYield = target;
    if (valid) {
      setText("adjustment-detail", "Keep {dose} g in and try about {yield} g out.", {
        dose: formatNumber(dose.valueAsNumber),
        yield: formatNumber(target),
      });
    } else {
      setText("adjustment-detail", "Enter the dose and yield above for a suggested target.");
    }
  } else {
    setText("adjustment-detail", recommendation.instruction);
  }

  if (applyYieldButton) {
    const canApply = Number.isFinite(pendingTargetYield) && pendingTargetYield !== yieldInCup.valueAsNumber;
    applyYieldButton.hidden = !canApply;
    if (canApply) {
      setText("apply-yield", "Use {yield} g for next shot", { yield: formatNumber(pendingTargetYield) });
    }
  }

  const oscillationNote = byId("oscillation-note");
  if (oscillationNote) {
    oscillationNote.hidden = !oscillation;
    setText(
      "oscillation-note",
      oscillation ? oscillation.message : "",
      oscillation?.midpoint === undefined ? {} : { midpoint: formatNumber(oscillation.midpoint) },
    );
  }

  setText(
    "last-ratio",
    valid ? "{dose} g in · {yield} g out · 1:{ratio}" : "Enter your shot weights",
    {
      dose: formatNumber(dose.valueAsNumber),
      yield: formatNumber(yieldInCup.valueAsNumber),
      ratio: formatNumber(currentRatio, 1, 1),
    },
  );
  setText("adjustment-title", recommendation.title);
  byId("next-shot-tip").hidden = recommendation.change === "keep";
  setText("adjustment-why", recommendation.why);
  setText("adjustment-keep", recommendation.keep);
  setText("adjustment-watch", recommendation.watch);
  for (const name of ["taste", "flow"]) byId("mobile-" + name).value = selected(name);
  stepButtons.forEach((button) => {
    const field = byId(button.dataset.stepTarget);
    button.disabled = Number(button.dataset.step) < 0
      ? field.valueAsNumber <= Number(field.min)
      : field.valueAsNumber >= Number(field.max);
  });
}

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

function updateAdjustment() {
  renderAdjustment();
  remember();
}

function clearPreviousStep() {
  delete saved.previousStep;
}

document.querySelectorAll('input[name="taste"], input[name="flow"]').forEach((input) => {
  input.addEventListener("change", updateAdjustment);
});
dose.addEventListener("input", () => {
  clearPreviousStep();
  updateAdjustment();
});
yieldInCup.addEventListener("input", () => {
  clearPreviousStep();
  updateAdjustment();
});
roast.addEventListener("change", () => {
  clearPreviousStep();
  updateAdjustment();
});
temperature.addEventListener("input", updateAdjustment);
shotTime.addEventListener("input", updateAdjustment);

for (const name of ["taste", "flow"]) {
  byId("mobile-" + name).addEventListener("change", (event) => {
    document.querySelector('input[name="' + name + '"][value="' + event.target.value + '"]').checked = true;
    updateAdjustment();
  });
}

stepButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const field = byId(button.dataset.stepTarget);
    if (field === dose || field === yieldInCup) clearPreviousStep();
    const initial = Number.isFinite(field.valueAsNumber) ? field.valueAsNumber : defaultStepStart(field);
    const nextValue = Math.round((initial + Number(button.dataset.step)) * 10) / 10;
    field.value = Math.min(Number(field.max), Math.max(Number(field.min), nextValue));
    updateAdjustment();
  });
});

if (applyYieldButton) {
  applyYieldButton.addEventListener("click", () => {
    if (!Number.isFinite(pendingTargetYield)) return;
    const taste = selected("taste");
    const doseValid = dose.validity.valid;
    const yieldValid = yieldInCup.validity.valid;
    const currentRatio = doseValid && yieldValid ? yieldInCup.valueAsNumber / dose.valueAsNumber : NaN;
    const context = { roast: roast.value, ratio: currentRatio };
    const seconds = shotTime.validity.valid && shotTime.value !== "" ? shotTime.valueAsNumber : NaN;
    const flow = resolveShotFlow(selected("flow"), seconds, context);
    const recommendation = nextAdjustment(taste, flow, context);
    saved.previousStep = {
      taste,
      change: recommendation.change,
      prevYield: yieldInCup.valueAsNumber,
      appliedYield: pendingTargetYield,
    };
    yieldInCup.value = String(pendingTargetYield);
    updateAdjustment();
  });
}

if (resetButton) {
  resetButton.addEventListener("click", () => {
    dose.value = "18";
    yieldInCup.value = "36";
    roast.value = "medium";
    temperature.value = "";
    shotTime.value = "";
    document.querySelector('input[name="taste"][value="sour"]').checked = true;
    document.querySelector('input[name="flow"][value="auto"]').checked = true;
    saved = {};
    lastStored = null;
    try {
      localStorage.removeItem(key);
    } catch { /* Storage is optional. */ }
    updateAdjustment();
  });
}

try {
  lastStored = localStorage.getItem(key);
  saved = JSON.parse(lastStored) || {};
  for (const field of fields) {
    if (saved[field.id] === undefined) continue;
    const initial = field.value;
    field.value = saved[field.id];
    if (!field.validity.valid || (!field.value && !optionalFields.has(field))) field.value = initial;
  }
  if (!Object.hasOwn(saved, "shot-time") && saved.flow === "steady") saved.flow = "auto";
  for (const input of document.querySelectorAll('input[type="radio"]')) {
    if (input.value === saved[input.name]) input.checked = true;
  }
} catch { /* Storage is optional. */ }

initializeLanguage(renderAdjustment);