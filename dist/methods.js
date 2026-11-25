import { formatNumber, t } from "./language.js";

export const v60Presets = [
  { id: "hoffmann", name: "James Hoffmann", dose: 15, water: 250, temp: 95, finish: 180,
    steps: [0, 45, 70, 90, 110].map(start => ({ start, water: 50, label: "", note: "" })) },
  { id: "three", name: "Three-pour V60", ratio: 16, temp: 94, finish: 180,
    pours: [[0, 20], [40, 40], [85, 40]] },
];

const units = value => Math.round(value * 10);
const grams = value => units(value) / 10;
const amount = (value, min, max) =>
  Number.isFinite(value) && value >= min && value <= max && grams(value) === value;
const time = value => Number.isInteger(value) && value >= 0 && value <= 3600;

function validRecipe(recipe, requireFinish) {
  return typeof recipe?.name === "string" && recipe.name.trim() && recipe.name.length <= 60 &&
    amount(recipe.dose, 1, 60) && amount(recipe.water, 1, 2000) &&
    Number.isInteger(recipe.temp) && recipe.temp >= 50 && recipe.temp <= 100 &&
    Array.isArray(recipe.steps) && recipe.steps.length > 0 &&
    recipe.steps.every((step, i, steps) => step && time(step.start) &&
      (i === 0 ? step.start === 0 : step.start > steps[i - 1].start) &&
      amount(step.water, 0, 2000) && typeof step.label === "string" && typeof step.note === "string") &&
    recipe.steps.reduce((total, step) => total + units(step.water), 0) === units(recipe.water) &&
    (recipe.finish == null
      ? !requireFinish
      : time(recipe.finish) && recipe.finish > recipe.steps.at(-1).start);
}

function validLegacy(recipe) {
  return typeof recipe?.name === "string" && recipe.name.trim() &&
    Number.isFinite(recipe.ratio) && recipe.ratio >= 5 && recipe.ratio <= 30 &&
    Number.isInteger(recipe.temp) && recipe.temp >= 50 && recipe.temp <= 100 &&
    time(recipe.finish) &&
    Array.isArray(recipe.pours) && recipe.pours.length > 0 &&
    recipe.pours.every((pour, i, pours) => Array.isArray(pour) && time(pour[0]) &&
      (i === 0 ? pour[0] === 0 : pour[0] > pours[i - 1][0]) && pour[0] < recipe.finish &&
      Number.isInteger(pour[1]) && pour[1] > 0) &&
    recipe.pours.reduce((total, pour) => total + pour[1], 0) === 100;
}

function convertLegacy(recipe, dose, water) {
  let previous = 0;
  let percent = 0;
  const steps = recipe.pours.map(([start, share]) => {
    percent += share;
    const total = grams(water * percent / 100);
    const step = { start, water: grams(total - previous), label: "", note: "" };
    previous = total;
    return step;
  });
  return { ...recipe, dose, water, steps };
}

export function recipeSchedule(recipe, water = recipe.water) {
  let added = 0;
  const schedule = recipe.steps.map((step, i) => {
    added += units(step.water);
    return {
      start: step.start,
      kind: step.water > 0 ? "pour" : "step",
      label: step.label || "Step {count}",
      labelValues: { count: i + 1 },
      note: step.note,
      ...(step.water > 0 && { total: grams(added * water / units(recipe.water)) }),
    };
  });
  if (recipe.finish != null) {
    schedule.push({ start: recipe.finish, kind: "finish", label: "Target finish" });
  }
  return schedule;
}

export function customBrew(settings, recipe) {
  const brews = settings.batch === "separate" ? settings.servings : 1;
  const totalDose = recipe.pours ? settings.dose : grams(recipe.dose * settings.servings);
  const dosePerBrew = totalDose / brews;
  if (recipe.pours) {
    const water = Math.round(dosePerBrew * recipe.ratio);
    let share = 0;
    const schedule = recipe.pours.map(([start, percent], i) => {
      share += percent;
      return { kind: "pour", label: "Pour {count}", labelValues: { count: i + 1 },
        start, total: Math.round(water * share / 100) };
    });
    const finish = { start: recipe.finish, kind: "finish", label: "Target finish" };
    schedule.push(finish);
    return { brews, totalDose, dosePerBrew, waterPerBrew: water, water: water * brews,
      ratio: recipe.ratio, temperature: recipe.temp + " °C",
      temperatureNote: "Start each pour at the listed time.", schedule, finish };
  }

  const waterPerBrew = grams(recipe.water * settings.servings / brews);
  const schedule = recipeSchedule(recipe, waterPerBrew);
  return { brews, totalDose, dosePerBrew, waterPerBrew, water: grams(waterPerBrew * brews),
    ratio: recipe.water / recipe.dose, temperature: recipe.temp + " °C",
    temperatureNote: recipe.setup || "Start each step at the listed time.",
    schedule, finish: schedule.at(-1) };
}

const editorMarkup = `
  <form id="method-form">
    <header class="editor-header">
      <div><p class="eyebrow" id="editor-method"></p><h1 id="editor-title" tabindex="-1"></h1></div>
      <button type="button" class="editor-button" id="cancel-method" data-i18n>Cancel</button>
    </header>
    <section class="editor-card">
      <label class="editor-field"><span data-i18n>Recipe name</span><input id="method-name" required maxlength="60"/></label>
      <div class="editor-amounts">
        <label class="editor-field"><span data-i18n>Coffee (g)</span><input id="method-dose" type="number" min="1" max="60" step="0.1" inputmode="decimal" required/></label>
        <label class="editor-field"><span data-i18n>Water (g)</span><input id="method-water" type="number" min="1" max="2000" step="0.1" inputmode="decimal" required/></label>
        <label class="editor-field"><span data-i18n>Water temperature (°C)</span><input id="method-temp" type="number" min="50" max="100" inputmode="numeric" required/></label>
      </div>
      <label class="editor-field"><span data-i18n>Preparation notes (optional)</span><textarea id="method-setup" rows="2" maxlength="600"></textarea></label>
    </section>
    <section class="editor-card">
      <h2 data-i18n>Brew steps</h2>
      <p class="field-help" data-i18n>Enter water added at each step. Leave it blank for steps such as stirring or pressing.</p>
      <ol id="method-steps" class="editor-steps"></ol>
      <button type="button" class="editor-button" id="add-step" data-i18n>Add step</button>
      <p class="field-help" id="editor-water-total" aria-live="polite"></p>
      <label class="editor-field editor-finish"><span id="editor-finish-label"></span><input id="method-finish" type="number" min="1" max="3600" inputmode="numeric"/></label>
    </section>
    <div class="editor-footer">
      <p id="method-error" role="alert" hidden></p>
      <button type="submit" class="editor-button editor-primary" data-i18n>Save recipe</button>
    </div>
  </form>
  <template id="method-step-template">
    <li class="editor-step">
      <div class="editor-step-heading">
        <strong data-step-heading></strong>
        <button type="button" class="editor-button editor-remove" data-remove-step>Remove</button>
      </div>
      <div class="editor-step-fields">
        <label class="editor-field"><span>Step name (optional)</span><input name="label" maxlength="60"/></label>
        <label class="editor-field"><span>Start (s)</span><input name="start" type="number" min="0" max="3600" inputmode="numeric" required/></label>
        <label class="editor-field"><span>Water added (g)</span><input name="water" type="number" min="0" max="2000" step="0.1" inputmode="decimal"/></label>
      </div>
      <label class="editor-field"><span>Step notes (optional)</span><textarea name="note" rows="2" maxlength="600"></textarea></label>
    </li>
  </template>`;

export function setupMethods({ menu, key, presets, onChange, fallbackActive, requireFinish = false, editPreset }) {
  const el = id => document.getElementById(id);
  let saved = [];
  let active = presets[0].id;
  try {
    const data = JSON.parse(localStorage.getItem(key));
    if (Array.isArray(data?.saved)) {
      saved = data.saved.filter(recipe => typeof recipe?.id === "string" && recipe.id.startsWith("user-") &&
        (validRecipe(recipe, requireFinish) || (requireFinish && validLegacy(recipe))));
    }
    const requested = data?.active ?? fallbackActive;
    if ([...presets, ...saved].some(recipe => recipe.id === requested)) active = requested;
  } catch { /* The built-in recipes are available without storage. */ }

  const editor = document.createElement("section");
  editor.id = "recipe-editor";
  editor.hidden = true;
  editor.setAttribute("aria-labelledby", "editor-title");
  editor.innerHTML = editorMarkup;
  document.querySelector(".workspace").append(editor);
  const deleteDialog = document.createElement("dialog");
  deleteDialog.className = "recipe-delete-dialog";
  deleteDialog.setAttribute("aria-labelledby", "delete-recipe-title");
  deleteDialog.innerHTML = `
    <h2 id="delete-recipe-title" data-i18n>Delete recipe?</h2>
    <p id="delete-recipe-name"></p>
    <p id="delete-recipe-error" role="alert" hidden></p>
    <div class="editor-step-heading">
      <button type="button" class="editor-button" id="cancel-delete" data-i18n autofocus>Cancel</button>
      <button type="button" class="editor-button editor-danger" id="confirm-delete" data-i18n>Delete</button>
    </div>`;
  document.querySelector(".workspace").append(deleteDialog);
  const list = el("method-steps");
  const finish = el("method-finish");
  finish.required = requireFinish;
  const removeRecipe = el("delete-method");
  let editing;
  let opener;
  let scrollTop;

  const all = () => [...presets, ...saved];
  const selected = () => all().find(recipe => recipe.id === active);
  const canDelete = () => saved.some(recipe => recipe.id === active);
  const nameOf = recipe => recipe.id.startsWith("user-") ? recipe.name : t(recipe.name);

  function refresh() {
    const options = all();
    if (menu.options.length !== options.length ||
        options.some((recipe, i) => menu.options[i].value !== recipe.id || menu.options[i].text !== nameOf(recipe))) {
      menu.replaceChildren(...options.map(recipe => new Option(nameOf(recipe), recipe.id)));
    }
    menu.value = active;
    removeRecipe.disabled = !canDelete();
  }

  function store(next, nextActive) {
    localStorage.setItem(key, JSON.stringify({ active: nextActive, saved: next }));
  }

  function select(id) {
    if (!all().some(recipe => recipe.id === id)) return;
    active = id;
    try { store(saved, active); } catch { /* Selection still works for this session. */ }
    refresh();
    onChange();
  }

  function showError(node, message) {
    node.hidden = !message;
    node.textContent = message ? t(message) : "";
  }

  function refreshSteps() {
    Array.from(list.children, (row, i) => {
      const label = t("Step {count}", { count: i + 1 });
      row.querySelector("[data-step-heading]").textContent = label;
      const button = row.querySelector("[data-remove-step]");
      button.setAttribute("aria-label", t("Remove step {count}", { count: i + 1 }));
      button.disabled = list.children.length <= 1;
    });
    const added = Array.from(list.querySelectorAll('[name="water"]'), input => units(input.valueAsNumber || 0))
      .reduce((sum, value) => sum + value, 0);
    const expected = el("method-water").valueAsNumber;
    el("editor-water-total").textContent = Number.isFinite(expected)
      ? t("{added} of {water} g assigned to steps", {
        added: formatNumber(added / 10), water: formatNumber(expected),
      }) : "";
  }

  function addStep(step = {}) {
    const row = el("method-step-template").content.firstElementChild.cloneNode(true);
    for (const label of row.querySelectorAll(".editor-field > span")) label.textContent = t(label.textContent);
    const remove = row.querySelector("[data-remove-step]");
    remove.textContent = t("Remove");
    for (const field of row.querySelectorAll("input, textarea")) field.value = step[field.name] ?? "";
    remove.addEventListener("click", () => {
      const next = row.nextElementSibling ?? row.previousElementSibling;
      row.remove();
      refreshSteps();
      next?.querySelector('[name="start"]').focus();
    });
    list.append(row);
    return row;
  }

  function copyName(recipe) {
    const base = nameOf(recipe);
    let suffix = " (" + t("copy") + ")";
    let name = base.slice(0, 60 - suffix.length) + suffix;
    for (let i = 2; all().some(item => item.name.toLocaleLowerCase() === name.toLocaleLowerCase()); i++) {
      suffix = " (" + t("copy") + " " + i + ")";
      name = base.slice(0, 60 - suffix.length) + suffix;
    }
    return name;
  }

  function openEditor(event, isEdit) {
    const current = selected();
    editing = isEdit && canDelete() ? current.id : null;
    const base = isEdit ? current : presets[0];
    const recipe = editPreset?.(base) ?? base;
    const seed = isEdit ? recipe.steps : [{ start: 0, water: recipe.water }];
    opener = event.currentTarget;
    scrollTop = window.scrollY;
    el("editor-method").textContent = t(requireFinish ? "V60 recipe" : "AeroPress recipe");
    el("editor-title").textContent = t(isEdit ? (editing ? "Edit recipe" : "Copy and edit recipe") : "Add recipe");
    el("method-name").value = editing ? current.name : isEdit ? copyName(current) : "";
    el("method-dose").value = recipe.dose;
    el("method-water").value = recipe.water;
    el("method-temp").value = recipe.temp;
    el("method-setup").value = isEdit ? t(recipe.setup || "") : "";
    finish.value = recipe.finish ?? "";
    el("editor-finish-label").textContent = t(requireFinish ? "Target finish (seconds)" : "Target finish (optional, s)");
    list.replaceChildren();
    seed.forEach(addStep);
    refreshSteps();
    showError(el("method-error"), "");
    editor.hidden = false;
    window.scrollTo({ top: 0, behavior: "instant" });
    el("editor-title").focus({ preventScroll: true });
  }

  function closeEditor() {
    editor.hidden = true;
    window.scrollTo({ top: scrollTop, behavior: "instant" });
    opener.focus({ preventScroll: true });
  }

  menu.addEventListener("change", () => select(menu.value));
  el("create-method").addEventListener("click", event => openEditor(event, false));
  el("edit-method").addEventListener("click", event => openEditor(event, true));
  el("cancel-method").addEventListener("click", closeEditor);
  editor.addEventListener("keydown", event => {
    if (event.key === "Escape") closeEditor();
  });
  el("add-step").addEventListener("click", () => {
    const row = addStep();
    refreshSteps();
    row.querySelector('[name="start"]').focus();
  });
  el("method-form").addEventListener("input", refreshSteps);
  el("method-form").addEventListener("submit", event => {
    event.preventDefault();
    const recipe = {
      id: editing ?? "user-" + crypto.randomUUID(),
      name: el("method-name").value.trim(),
      dose: el("method-dose").valueAsNumber,
      water: el("method-water").valueAsNumber,
      temp: el("method-temp").valueAsNumber,
      setup: el("method-setup").value.trim(),
      finish: finish.value === "" ? null : finish.valueAsNumber,
      steps: Array.from(list.children, row => ({
        start: row.querySelector('[name="start"]').valueAsNumber,
        water: row.querySelector('[name="water"]').valueAsNumber || 0,
        label: row.querySelector('[name="label"]').value.trim(),
        note: row.querySelector('[name="note"]').value.trim(),
      })),
    };
    const error = el("method-error");
    if (!validRecipe(recipe, requireFinish)) {
      showError(error, "Name your recipe, start at 0 s, use increasing timestamps, and assign all the water. If set, finish must be after the last step.");
      return;
    }
    if (all().some(other => other.id !== editing &&
        [other.name, nameOf(other)].some(name => name.toLocaleLowerCase() === recipe.name.toLocaleLowerCase()))) {
      showError(error, "Choose a different recipe name.");
      return;
    }
    const next = editing ? saved.map(other => other.id === editing ? recipe : other) : [...saved, recipe];
    try { store(next, recipe.id); }
    catch { showError(error, "Browser storage is unavailable. Your recipe could not be saved."); return; }
    saved = next;
    active = recipe.id;
    closeEditor();
    refresh();
    onChange();
  });

  let pendingDelete;
  removeRecipe.addEventListener("click", () => {
    if (!canDelete()) return;
    pendingDelete = active;
    el("delete-recipe-name").textContent = selected().name;
    showError(el("delete-recipe-error"), "");
    deleteDialog.showModal();
  });
  el("cancel-delete").addEventListener("click", () => deleteDialog.close());
  el("confirm-delete").addEventListener("click", () => {
    const next = saved.filter(recipe => recipe.id !== pendingDelete);
    const nextActive = active === pendingDelete ? presets[0].id : active;
    try { store(next, nextActive); }
    catch {
      showError(el("delete-recipe-error"), "Browser storage is unavailable. Your recipe could not be deleted.");
      return;
    }
    saved = next;
    active = nextActive;
    deleteDialog.close();
    refresh();
    menu.focus();
    onChange();
  });

  refresh();
  return { refresh, selected, select };
}

export function editV60Recipe(recipe) {
  if (recipe.pours) return convertLegacy(recipe, 15, grams(15 * recipe.ratio));
  return recipe;
}
