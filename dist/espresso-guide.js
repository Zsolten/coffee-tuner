const holdEverything = "Dose, grind, temperature, and pre-infusion. Taste before changing anything else.";

export const roastProfiles = Object.freeze({
  dark: {
    starterRatio: 1.7,
    minRatio: 1.4,
    maxRatio: 2.1,
    fastSec: 18,
    slowSec: 35,
    low: 88,
    high: 91,
    defaultTemp: 90,
    note: "Dark roasts usually shine around 1:1.5–1:1.8 at 88–91 °C.",
  },
  medium: {
    starterRatio: 2.0,
    minRatio: 1.6,
    maxRatio: 2.5,
    fastSec: 20,
    slowSec: 40,
    low: 91,
    high: 94,
    defaultTemp: 93,
    note: "Medium roasts usually shine around 1:2–1:2.2 at 91–94 °C.",
  },
  light: {
    starterRatio: 2.5,
    minRatio: 1.9,
    maxRatio: 3.2,
    fastSec: 20,
    slowSec: 48,
    low: 93,
    high: 96,
    defaultTemp: 94,
    note: "Light roasts usually shine around 1:2.3–1:2.8 at 93–96 °C (closer to 1:2 for heavy naturals).",
  },
});

function adjustYield(direction, detail) {
  return {
    ...detail,
    change: direction,
    keep: holdEverything,
  };
}

const preparePuck = {
  change: "prep",
  title: "Repeat with more even puck prep",
  instruction: "Break up clumps, distribute grounds to the edges, and tamp level.",
  why: "An uneven flow can over-extract some areas and under-extract others. A mix of sharp acidity and harshness can show up in the same cup.",
  keep: "Repeat the same dose, grind, yield, temperature, and pre-infusion.",
  watch: "Look for a steadier flow and a less drying finish. If the shot still runs very slowly, try one small step coarser on the following shot.",
};

const adjustments = {
  finer: {
    change: "finer",
    title: "Grind a little finer",
    instruction: "Move the grinder one small step finer. Stop at the same yield.",
    why: "Fast flow gives water too little contact time and surface area to pull enough sweetness or body from the puck.",
    keep: "Dose, yield, temperature, pre-infusion, and puck prep.",
    watch: "Look for slower, steadier flow and more sweetness. If the shot starts spraying or dries out your mouth, back off and check distribution.",
  },
  finerAtCeiling: {
    change: "finer",
    title: "Grind a micro-step finer",
    instruction: "Keep your current yield and move the grinder one tiny step finer.",
    why: "Your brew ratio is already long for this roast. Stretching yield further will make the cup watery rather than sweet, so add surface area instead.",
    keep: "Dose, yield, temperature, pre-infusion, and puck prep.",
    watch: "Look for rounder sweetness without dryness. If a finer step turns the finish rough, return to your prior grind and raise temperature by 1–2 °C.",
  },
  coarser: {
    change: "coarser",
    title: "Grind a little coarser",
    instruction: "Move the grinder one small step coarser. Stop at the same yield when the flow recovers.",
    why: "Grinding past the puck’s resistance peak clogs fine pathways, dropping overall extraction while over-extracting narrow channels.",
    keep: "Dose, target yield, temperature, and pre-infusion.",
    watch: "Look for a steady flow. If it tastes sour with steady flow, test a slightly longer yield on a later shot.",
  },
  coarserAtFloor: {
    change: "coarser",
    title: "Grind a micro-step coarser",
    instruction: "Keep your current yield and move the grinder one tiny step coarser.",
    why: "Your yield is already very short for this roast. Cutting yield further shrinks the drink without fixing harshness, so reduce puck resistance instead.",
    keep: "Dose, target yield, temperature, and pre-infusion.",
    watch: "Look for a cleaner, sweeter finish. On darker roasts, lowering brew temperature by 1–2 °C on a later shot can also soften bitterness.",
  },
  fastBitterCheck: {
    change: "prep",
    title: "Check puck prep before shortening",
    instruction: "Break up clumps, tamp level, and repeat at the same yield before cutting the shot shorter.",
    why: "A very fast shot at a normal ratio rarely over-extracts evenly—either water is jetting through channels, or intense sharpness is registering as bitterness.",
    keep: "Repeat the same dose, grind, yield, temperature, and pre-infusion.",
    watch: "If clean puck prep still gushes fast, move one small step finer rather than shrinking the yield.",
  },
  sour: adjustYield("longer", {
    title: "Pull a slightly longer shot",
    why: "With steady flow, a little more yield can increase extraction and soften sharp sourness. Expect a slightly lighter body.",
    watch: "Look for more sweetness and a softer finish. If you only lose body, return to your prior yield and try a small grind adjustment.",
  }),
  bitter: adjustYield("shorter", {
    title: "Stop the shot a little earlier",
    why: "A shorter yield can reduce extraction and the lingering bitterness in the cup. It may also make the shot more concentrated.",
    watch: "Look for a shorter bitter finish. If the shot turns sharply sour, bring back a little yield.",
  }),
  dryLongRatio: adjustYield("shorter", {
    title: "Shorten the yield to cut late dryness",
    why: "At a longer ratio, late-extracting compounds can leave a rough, tea-like dryness even when the stream looks steady.",
    watch: "Look for a smoother finish. If dryness stays at a shorter yield, check puck prep or try one micro-step coarser.",
  }),
  dry: {
    ...preparePuck,
    why: "A drying sensation is astringency. It usually comes from localized channeling, or from grinding just fine enough to cause micro-clogging.",
    watch: "If careful distribution and tamping still leave the finish drying at a steady time, try one small step coarser on the shot after.",
  },
  thin: adjustYield("shorter", {
    title: "Shorten the yield for more body",
    why: "If the taste is already balanced, a little less liquid can give a more concentrated, fuller cup.",
    watch: "Shortening yield slightly lowers extraction—if a hint of sharpness appears, keep the shorter yield and go one micro-step finer next.",
  }),
  heavy: adjustYield("longer", {
    title: "Lengthen the yield for a lighter cup",
    why: "If the shot is already balanced, more liquid can lower its concentration and lighten its body.",
    watch: "Stop extending the yield if the finish becomes bitter or drying.",
  }),
  balanced: {
    change: "keep",
    title: "Keep this recipe",
    instruction: "Record the dose, yield, grind setting, and timing so you can repeat it.",
    why: "A balanced taste and repeatable flow are strong signs that you’re dialed in.",
    keep: "Reuse the entire recipe with the same coffee.",
    watch: "When the coffee ages or you open a new bag, repeat the recipe once and use the result as your starting point.",
  },
};

export function starterYieldForRoast(doseInGrams, roast) {
  const profile = roastProfiles[roast] ?? roastProfiles.medium;
  if (!Number.isFinite(doseInGrams) || doseInGrams <= 0) return 36;
  return Math.min(120, Math.max(4, Math.round(doseInGrams * profile.starterRatio * 2) / 2));
}

export function resolveShotFlow(observedFlow, seconds, context = {}) {
  if (observedFlow !== "auto") return observedFlow;
  if (!Number.isInteger(seconds) || seconds < 1 || seconds > 180) return "steady";
  const profile = roastProfiles[context.roast] ?? roastProfiles.medium;
  const ratio = Number.isFinite(context.ratio) && context.ratio > 0 ? context.ratio : profile.starterRatio;
  const extraYieldAllowance = ratio >= 2.4 && context.roast !== "light" ? 4 : 0;
  if (seconds < profile.fastSec) return "fast";
  if (seconds > profile.slowSec + extraYieldAllowance) return "slow";
  return "steady";
}

export function nextAdjustment(taste, flow, context = {}) {
  const profile = roastProfiles[context.roast] ?? roastProfiles.medium;
  const ratio = Number.isFinite(context.ratio) && context.ratio > 0 ? context.ratio : profile.starterRatio;

  if (flow === "uneven" || taste === "mixed") return preparePuck;
  if (taste === "balanced") return adjustments.balanced;
  if (flow === "slow") return adjustments.coarser;

  if (flow === "fast") {
    if (taste === "sour" || taste === "thin") return adjustments.finer;
    if (taste === "dry") return adjustments.dry;
    if (taste === "bitter") {
      return ratio > profile.starterRatio + 0.15 || context.roast === "dark"
        ? adjustments.bitter
        : adjustments.fastBitterCheck;
    }
    if (taste === "heavy") {
      return ratio < profile.maxRatio ? adjustments.heavy : adjustments.finer;
    }
  }

  if (taste === "sour") {
    return ratio < profile.maxRatio ? adjustments.sour : adjustments.finerAtCeiling;
  }
  if (taste === "bitter") {
    return ratio > profile.minRatio ? adjustments.bitter : adjustments.coarserAtFloor;
  }
  if (taste === "dry") {
    return ratio > profile.starterRatio + 0.3 ? adjustments.dryLongRatio : adjustments.dry;
  }
  if (taste === "thin") {
    return ratio > profile.minRatio ? adjustments.thin : adjustments.finer;
  }
  if (taste === "heavy") {
    return ratio < profile.maxRatio ? adjustments.heavy : adjustments.coarser;
  }
  return adjustments[taste] ?? preparePuck;
}

export function calculateYieldTarget(yieldInCup, change) {
  if (change !== "longer" && change !== "shorter") return yieldInCup;
  const delta = Math.max(2, Math.round(yieldInCup * 0.11 * 2) / 2);
  const next = change === "longer" ? yieldInCup + delta : yieldInCup - delta;
  return Math.min(120, Math.max(4, Math.round(next * 2) / 2));
}

export function detectOscillation(previousStep, currentTaste, nextChange) {
  if (!previousStep || !previousStep.change || !previousStep.taste) return null;
  if (
    (previousStep.change === "longer" && previousStep.taste === "sour" && currentTaste === "bitter") ||
    (previousStep.change === "shorter" && previousStep.taste === "bitter" && currentTaste === "sour")
  ) {
    const hasBothYields = Number.isFinite(previousStep.prevYield) && Number.isFinite(previousStep.appliedYield);
    if (hasBothYields) {
      const midpoint = Math.round(((previousStep.prevYield + previousStep.appliedYield) / 2) * 2) / 2;
      return {
        midpoint,
        message: "You passed the balance point — try about {midpoint} g, halfway between your last two yields.",
      };
    }
    return {
      message: "You passed the balance point — split the difference halfway between your last two yields.",
    };
  }
  if (
    (previousStep.change === "finer" && (nextChange === "coarser" || currentTaste === "dry")) ||
    (previousStep.change === "coarser" && nextChange === "finer")
  ) {
    return {
      message: "That grind step jumped past the sweet spot — try halfway between your last two grind settings.",
    };
  }
  return null;
}

export function espressoTemperatureGuide(roast, temperature, taste, flow) {
  const { low, high, note } = roastProfiles[roast] ?? roastProfiles.medium;
  if (!Number.isFinite(temperature) || flow !== "steady") return { note };

  if (taste === "sour" && temperature + 1 <= high) {
    return {
      note,
      target: Math.round((temperature + 1) * 10) / 10,
      followUp: "If the shot still tastes sharply sour after adjusting yield, try {temperature} °C on a later shot. Keep the other settings fixed.",
    };
  }
  if (taste === "bitter" && temperature - 1 >= low) {
    return {
      note,
      target: Math.round((temperature - 1) * 10) / 10,
      followUp: "If the shot still tastes bitter after adjusting yield, try {temperature} °C on a later shot. Keep the other settings fixed.",
    };
  }
  return { note };
}