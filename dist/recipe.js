export const doseLimits = Object.freeze({ min: 5, max: 60 });

export const styles = Object.freeze({
  bright: { ratio: 17.5, description: "More water for a lighter, more open cup." },
  balanced: { ratio: 50 / 3, description: "A middle ground for clarity and body." },
  full: { ratio: 15.5, description: "Less water for a more concentrated cup." },
});

export function isValidDose(dose) {
  return Number.isFinite(dose) && dose >= doseLimits.min && dose <= doseLimits.max &&
    Math.abs(dose * 10 - Math.round(dose * 10)) < 1e-8;
}

export function isValidSettings(settings) {
  return Boolean(settings && isValidDose(settings.dose) &&
    Number.isInteger(settings.servings) && settings.servings >= 1 && settings.servings <= 4 &&
    Object.hasOwn(hoffmannRoasts, settings.roast) && Object.hasOwn(styles, settings.style));
}

export function scaleDose(dosePerServing, servings) {
  const rounded = Math.round(dosePerServing * servings * 10) / 10;
  return Math.min(doseLimits.max, Math.max(doseLimits.min, rounded));
}

export const gramsPerServing = 15;

export const defaultSettings = Object.freeze({
  dose: gramsPerServing, servings: 1, roast: "medium", style: "balanced",
  batch: "separate", bloomMethod: "swirl",
});

const hoffmannRoasts = Object.freeze({
  light: { temperature: "100 °C", note: "Use water fresh off the boil. Start on the finer side of medium-fine." },
  "medium-light": { temperature: "95–100 °C", note: "Start medium-fine. Try hotter water if the cup needs more sweetness." },
  medium: { temperature: "90–95 °C", note: "Start medium-fine and dial in by taste." },
  "medium-dark": { temperature: "≈90 °C", note: "Grind a little coarser if the cup is harsh or drying." },
  dark: { temperature: "80–85 °C", note: "Use cooler water and grind a little coarser." },
});

export const batchModes = ["separate", "combined"];
export const bloomMethods = ["swirl", "stir"];

export function calculateHoffmann({ dose, servings, roast, style, batch, bloomMethod }) {
  const brews = batch === "separate" ? servings : 1;
  const dosePerBrew = dose / brews;
  const waterPerBrew = Math.round(dosePerBrew * styles[style].ratio);
  const targets = Array.from({ length: 5 }, (_, index) => Math.round(waterPerBrew * (index + 1) / 5));
  const charges = targets.map((target, index) => target - (targets[index - 1] ?? 0));
  const paceDuration = Math.ceil(Math.max(...charges) / 5);
  const bloomPourEnd = Math.max(10, paceDuration);
  const bloomMixEnd = bloomPourEnd + 5;
  const bloomEnd = Math.max(45, bloomMixEnd + 10);
  const mix = bloomMethod === "stir";
  const schedule = [
    { kind: "pour", label: "Bloom pour", note: "Add {grams} g · center out in a spiral", noteValues: { grams: charges[0] },
      start: 0, end: bloomPourEnd, total: targets[0] },
    { kind: "mix", label: mix ? "Stir the bloom" : "Swirl the bloom",
      note: mix ? "Gently stir to wet dry pockets." : "Lift the brewer slightly and swirl gently.",
      start: bloomPourEnd, end: bloomMixEnd },
    { kind: "rest", label: "Let it bloom", start: bloomMixEnd, end: bloomEnd },
  ];
  let nextPour = bloomEnd;

  for (let index = 1; index < targets.length; index++) {
    const duration = Math.max(10, paceDuration) + (index === 1 ? 5 : 0);
    const end = nextPour + duration;
    schedule.push({ kind: "pour", label: "Pulse {count}", labelValues: { count: index },
      note: "Add {grams} g · low, circular pour", noteValues: { grams: charges[index] },
      start: nextPour, end, total: targets[index] });

    if (index < targets.length - 1) {
      schedule.push({ kind: "rest", label: "Pause", start: end, end: end + 10 });
    }
    nextPour = end + 10;
  }

  const lastPourEnd = schedule.at(-1).end;
  const finalSwirlEnd = lastPourEnd + 5;
  const finish = { start: lastPourEnd + 60 };
  schedule.push(
    { kind: "mix", label: "Final swirl", note: "Swirl gently to level the bed.",
      start: lastPourEnd, end: finalSwirlEnd },
    { kind: "rest", label: "Drawdown", note: "Let the water drain through the bed.",
      start: finalSwirlEnd, end: finish.start },
    { kind: "finish", label: "Target finish", note: "Stop when the bed drains. Taste to dial in.",
      start: finish.start },
  );

  return {
    brews,
    dosePerBrew,
    waterPerBrew,
    water: waterPerBrew * brews,
    ratio: (waterPerBrew / dosePerBrew).toFixed(1),
    temperature: hoffmannRoasts[roast].temperature,
    temperatureNote: hoffmannRoasts[roast].note,
    schedule,
    finish,
  };
}
