import { calculateYieldTarget, nextAdjustment, preInfusionGuide } from "./espresso-guide.js";
import { formatNumber, initializeLanguage, t } from "./language.js";

const byId = (id) => document.getElementById(id);
const dose = byId("shot-dose");
const yieldInCup = byId("shot-yield");
const infusion = byId("infusion-seconds");

function setText(id, message, values) {
  byId(id).textContent = t(message, values);
}

function selected(name) {
  return document.querySelector('input[name="' + name + '"]:checked').value;
}

function renderAdjustment() {
  const recommendation = nextAdjustment(selected("taste"), selected("flow"));
  const doseValid = dose.validity.valid;
  const yieldValid = yieldInCup.validity.valid;
  const valid = doseValid && yieldValid;

  dose.setAttribute("aria-invalid", String(!doseValid));
  yieldInCup.setAttribute("aria-invalid", String(!yieldValid));
  byId("weight-help").classList.toggle("error", !valid);
  setText("weight-help", valid
    ? "Enter dry grounds and the actual espresso weight."
    : "Enter a 4–36 g dose and a 4–120 g yield, with up to one decimal place.");

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
    ratio: formatNumber(yieldInCup.valueAsNumber / dose.valueAsNumber, 2),
  });
  setText("adjustment-title", recommendation.title);
  setText("adjustment-detail", detail);
  setText("adjustment-why", recommendation.why);
  setText("adjustment-keep", recommendation.keep);
  setText("adjustment-watch", recommendation.watch);
  for (const name of ["taste", "flow"]) byId("mobile-" + name).value = selected(name);
  document.querySelectorAll("[data-step-target]").forEach(button => {
    const field = byId(button.dataset.stepTarget);
    button.disabled = Number(button.dataset.step) < 0 ? field.valueAsNumber <= Number(field.min) : field.valueAsNumber >= Number(field.max);
  });
}

function renderInfusion() {
  const seconds = infusion.valueAsNumber;
  const range = preInfusionGuide(seconds);
  setText("infusion-value", "{seconds} s", { seconds });
  setText("infusion-label", range.label);
  setText("infusion-heading", range.heading);
  setText("infusion-detail", range.detail);
  infusion.setAttribute("aria-valuetext", t("{seconds} seconds, {description}", { seconds, description: t(range.label) }));
}

document.querySelectorAll('input[name="taste"], input[name="flow"]').forEach((input) => {
  input.addEventListener("change", renderAdjustment);
});
dose.addEventListener("input", renderAdjustment);
yieldInCup.addEventListener("input", renderAdjustment);
infusion.addEventListener("input", renderInfusion);

for (const name of ["taste", "flow"]) {
  byId("mobile-" + name).addEventListener("change", event => {
    document.querySelector('input[name="' + name + '"][value="' + event.target.value + '"]').checked = true;
    renderAdjustment();
  });
}
document.querySelectorAll("[data-step-target]").forEach(button => {
  button.addEventListener("click", () => {
    const field = byId(button.dataset.stepTarget);
    const initial = Number.isFinite(field.valueAsNumber) ? field.valueAsNumber : Number(field.defaultValue);
    const increment = field.id === "shot-dose" ? 0.1 : 1;
    field.value = Math.min(Number(field.max), Math.max(Number(field.min), Math.round((initial + Number(button.dataset.step) * increment) * 10) / 10));
    renderAdjustment();
  });
});
initializeLanguage(() => {
  renderAdjustment();
  renderInfusion();
});
