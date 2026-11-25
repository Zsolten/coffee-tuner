import {
  batchModes, bloomMethods, calculateHoffmann, defaultSettings, doseLimits,
  gramsPerServing, isValidDose, isValidSettings, scaleDose, styles,
} from "./recipe.js";
import { formatNumber, initializeLanguage, t } from "./language.js";

const byId = (id) => document.getElementById(id);
const doseInput = byId("dose");
const roastSelect = byId("roast");
import { setupMethods, customBrew } from "./methods.js";
const methods = setupMethods(update);
const lessButton = byId("less-dose");
const moreButton = byId("more-dose");
const timerToggle = byId("timer-toggle");
const timerReset = byId("timer-reset");
const storageKey = "v60-recipe-tuner-v3";
let settings = restoreSettings();
let invalidDose = false;
let announcement;
let schedule = [];
let rows = [];
let timerStartedAt = null;
let elapsedBeforeRun = 0;
let timerInterval;
let activeRow = -1;

function restoreSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    const previous = saved ? null : JSON.parse(localStorage.getItem("v60-recipe-tuner-v2"));
    const candidate = saved ?? previous?.recipes?.hoffmann;
    if (isValidSettings(candidate)) {
      return {
        dose: candidate.dose, servings: candidate.servings,
        roast: candidate.roast, style: candidate.style,
        batch: batchModes.includes(candidate.batch) ? candidate.batch : defaultSettings.batch,
        bloomMethod: bloomMethods.includes(candidate.bloomMethod) ? candidate.bloomMethod : defaultSettings.bloomMethod,
      };
    }
  } catch {
    // The tuner uses the defaults if browser storage is unavailable.
  }
  return { ...defaultSettings };
}

function rememberSettings() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(settings));
  } catch {
    // Storage is optional for calculating a brew.
  }
}

function formatTime(seconds) {
  return Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0");
}

function formatStageTime(stage) {
  if (stage.end !== undefined) return formatTime(stage.start) + "–" + formatTime(stage.end);
  return (stage.kind === "finish" ? "≈" : "") + formatTime(stage.start);
}

function setText(id, text, values) {
  byId(id).textContent = t(text, values);
}

function setWeight(id, number) {
  byId(id).firstChild.nodeValue = formatNumber(number) + " ";
}

function renderSchedule(stages) {
  schedule = stages;
  activeRow = -1;
  rows = stages.map((stage) => {
    const row = document.createElement("li");
    row.className = stage.kind;
    const time = document.createElement("span");
    time.className = "stage-time";
    time.textContent = formatStageTime(stage);
    const info = document.createElement("div");
    info.className = "stage-info";
    const label = document.createElement("strong");
    label.textContent = t(stage.label, stage.labelValues);
    info.append(label);
    if (stage.note) {
      const note = document.createElement("small");
      note.textContent = t(stage.note, stage.noteValues);
      info.append(note);
    }
    row.append(time, info);
    if (stage.total !== undefined) {
      const weight = document.createElement("span");
      weight.className = "stage-weight";
      weight.textContent = formatNumber(stage.total) + " ";
      const units = document.createElement("small");
      units.textContent = "g";
      weight.append(units);
      row.append(weight);
    }
    return row;
  });
  byId("schedule").replaceChildren(...rows);
  renderTimer();
}

function render() {
  const doseHelp = byId("dose-help");
  const batchNote = byId("batch-note");

  doseInput.setAttribute("aria-invalid", String(invalidDose));
  doseHelp.classList.toggle("error", invalidDose);
  setText("dose-help", invalidDose
    ? "Enter 5–60 g using up to one decimal place."
    : "Total grams of grounds for the batch.");
  lessButton.disabled = !invalidDose && settings.dose <= doseLimits.min;
  moreButton.disabled = !invalidDose && settings.dose >= doseLimits.max;
  setText("style-help", settings.style === "balanced"
    ? "The original ratio, about 1:16.7."
    : styles[settings.style].description);
  byId("batch-control").hidden = settings.servings === 1;

  const method = methods.selected();
  const recipe = method ? customBrew(settings, method) : calculateHoffmann({...settings, bloomMethod:"swirl"});
  byId("roast").closest(".control").hidden = !!method;
  byId("style-help").closest("fieldset").hidden = !!method;
  byId("method-guide").hidden = !!method;
  document.querySelector(".source-note").hidden = !!method;
  methods.refresh();
  setText("recipe-title", invalidDose ? "Recipe for last valid dose" : "Your recipe");
  setText("batch-detail", settings.servings === 1
    ? "{dose} g coffee · {count} serving"
    : "{dose} g coffee · {count} servings", { dose: formatNumber(settings.dose), count: settings.servings });
  setWeight("water", recipe.water);
  setText("ratio", "1:" + formatNumber(Number(recipe.ratio)));
  batchNote.hidden = true;

  byId("temperature").firstChild.nodeValue = recipe.temperature.replace(/°C$/, "");
  setText("temperature-note", recipe.temperatureNote);
  setText("batch-help", settings.batch === "separate"
    ? "Repeat the schedule with fresh grounds for each cup."
    : "Use a larger cone and pour all the water into one brew.");
  byId("dose-options-help").hidden = 18 * settings.servings <= doseLimits.max;
  for (const button of document.querySelectorAll("[data-dose]")) {
    const total = Number(button.dataset.dose) * settings.servings;
    button.disabled = total > doseLimits.max;
    button.setAttribute("aria-pressed", String(total === settings.dose));
  }

  if (recipe.brews > 1) {
    const portion = Math.round(recipe.dosePerBrew * 10) / 10;
    const amount = formatNumber(portion);
    const dose = portion === recipe.dosePerBrew ? amount : t("about {amount}", { amount });
    setText("batch-note", "Use {dose} g coffee and {water} g water per cup. Run the schedule {count} times.", {
      dose, water: formatNumber(recipe.waterPerBrew), count: recipe.brews,
    });
    batchNote.hidden = false;
  } else if (settings.dose > 18) {
    setText("batch-note", "Scaled single batch. Use a larger V60 and expect a different drawdown. " +
      "For a dose above 30 g, consider brewing smaller batches.");
    batchNote.hidden = false;
  }

  renderSchedule(recipe.schedule);

  return recipe;
}

function announce(recipe) {
  clearTimeout(announcement);
  announcement = setTimeout(() => {
    setText("recipe-status", invalidDose
      ? "Enter a valid coffee dose. The recipe shows the last valid dose."
      : "{water} grams of brew water. Target finish {time}.", {
      water: formatNumber(recipe.water),
      time: formatStageTime({ ...recipe.finish, kind: "finish" }),
    });
  }, 250);
}

function update() {
  resetTimer();
  const recipe = render();
  rememberSettings();
  announce(recipe);
}

function syncInputs() {
  doseInput.value = settings.dose;
  roastSelect.value = settings.roast;

  document.querySelectorAll('input[type="radio"]').forEach((input) => {
    input.checked = input.value === String(settings[input.name]);
  });
}

function setDose(dose) {
  settings.dose = dose;
  doseInput.value = dose;
  invalidDose = false;
  update();
}

doseInput.addEventListener("input", () => {
  const dose = doseInput.valueAsNumber;
  if (isValidDose(dose)) {
    settings.dose = dose;
    invalidDose = false;
    update();
  } else {
    invalidDose = true;
    announce(render());
  }
});

lessButton.addEventListener("click", () => setDose(scaleDose(settings.dose - 1, 1)));
moreButton.addEventListener("click", () => setDose(scaleDose(settings.dose + 1, 1)));

document.querySelectorAll('input[name="servings"]').forEach((input) => {
  input.addEventListener("change", () => {
    settings.servings = Number(input.value);
    setDose(gramsPerServing * settings.servings);
  });
});

for (const button of document.querySelectorAll("[data-dose]")) {
  button.addEventListener("click", () => {
    setDose(scaleDose(Number(button.dataset.dose), settings.servings));
  });
}

roastSelect.addEventListener("change", () => {
  settings.roast = roastSelect.value;
  update();
});

document.querySelectorAll('input[name="style"], input[name="batch"]').forEach((input) => {
  input.addEventListener("change", () => {
    settings[input.name] = input.value;
    update();
  });
});

byId("reset").addEventListener("click", () => {
  settings = { ...defaultSettings };
  invalidDose = false;
  syncInputs();
  update();
});

function getElapsedMilliseconds() {
  return elapsedBeforeRun + (timerStartedAt === null ? 0 : performance.now() - timerStartedAt);
}

function renderTimer() {
  const elapsed = Math.floor(getElapsedMilliseconds() / 1000);
  const hasStarted = elapsedBeforeRun > 0 || timerStartedAt !== null;
  setText("timer-time", formatTime(elapsed));
  setText("timer-toggle", timerStartedAt !== null ? "Pause timer" : hasStarted ? "Resume timer" : "Start timer");
  timerReset.disabled = !hasStarted;

  const nextRow = hasStarted ? schedule.findLastIndex((stage) => stage.start <= elapsed) : -1;
  if (nextRow === activeRow) return;
  if (activeRow >= 0) {
    rows[activeRow].classList.remove("active");
    rows[activeRow].removeAttribute("aria-current");
  }
  activeRow = nextRow;
  if (activeRow >= 0) {
    rows[activeRow].classList.add("active");
    rows[activeRow].setAttribute("aria-current", "step");
  }
}

function resetTimer() {
  clearInterval(timerInterval);
  timerStartedAt = null;
  elapsedBeforeRun = 0;
  renderTimer();
}

timerToggle.addEventListener("click", () => {
  if (timerStartedAt === null) {
    timerStartedAt = performance.now();
    timerInterval = setInterval(renderTimer, 200);
  } else {
    elapsedBeforeRun = getElapsedMilliseconds();
    timerStartedAt = null;
    clearInterval(timerInterval);
  }
  renderTimer();
});

timerReset.addEventListener("click", resetTimer);

syncInputs();
initializeLanguage(render);

const settingsToggle = byId("settings-toggle");
settingsToggle.addEventListener("click", () => {
  const expanded = settingsToggle.getAttribute("aria-expanded") !== "true";
  settingsToggle.setAttribute("aria-expanded", String(expanded));
});

const mobileSettings = window.matchMedia("(max-width: 756px)");
const settingsPanel = byId("brew-settings");
const recipePanel = document.querySelector(".recipe");
const resetButton = byId("reset");

function positionSettings() {
  if (mobileSettings.matches) {
    recipePanel.querySelector(".recipe-overview").after(settingsPanel);
    settingsPanel.append(resetButton);
  } else {
    recipePanel.before(settingsPanel);
    document.querySelector(".page-header").append(resetButton);
  }
}
mobileSettings.addEventListener("change", positionSettings);
positionSettings();
