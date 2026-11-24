const holdEverything = "Dose, grind, temperature, and pre-infusion. Taste before changing anything else.";

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
    why: "Sourness with fast flow can mean the water is passing through too quickly. A small change adds resistance and can increase extraction.",
    keep: "Dose, yield, temperature, pre-infusion, and puck prep.",
    watch: "Look for slower, steadier flow and more sweetness. If the shot starts spraying or dries out your mouth, back off and check distribution.",
  },
  coarser: {
    change: "coarser",
    title: "Grind a little coarser",
    instruction: "Move the grinder one small step coarser. Stop at the same yield when the flow recovers.",
    why: "A very slow or stalled shot can extract unevenly through a tightly packed bed. Get a repeatable flow before chasing taste with yield.",
    keep: "Dose, target yield, temperature, and pre-infusion.",
    watch: "Look for a steady flow. If it tastes sour with steady flow, test a slightly longer yield on a later shot.",
  },
  sour: adjustYield("longer", {
    title: "Pull a slightly longer shot",
    why: "With steady flow, a little more yield can increase extraction and soften sharp sourness. Expect a slightly lighter body.",
    watch: "Look for more sweetness and a softer finish. If you only lose body, return to your prior yield and try a small grind adjustment.",
  }),
  bitter: adjustYield("shorter", {
    title: "Stop the shot a little earlier",
    why: "A shorter yield can reduce extraction and the lingering bitterness in the cup. It may also make the shot more concentrated.",
    watch: "If it stays harsh with a dark roast, keep the improved yield and try a small temperature decrease on a later shot if your machine allows it.",
  }),
  dry: {
    ...preparePuck,
    why: "A drying sensation is astringency. It can show up when water extracts unevenly or the grind is pushing too fine for a steady flow.",
  },
  thin: adjustYield("shorter", {
    title: "Shorten the yield for more body",
    why: "If the taste is already balanced, a little less liquid can give a more concentrated, fuller cup.",
    watch: "If acidity turns sharp, add back some yield. Use your previous balanced shot as a reference.",
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

export function nextAdjustment(taste, flow) {
  if (flow === "uneven" || taste === "mixed") return preparePuck;
  if (taste === "balanced") return adjustments.balanced;
  if (flow === "slow") return adjustments.coarser;
  if (flow === "fast" && taste === "sour") return adjustments.finer;
  return adjustments[taste];
}

export function calculateYieldTarget(yieldInCup, change) {
  if (change === "longer") return Math.round((yieldInCup * 1.1 + Number.EPSILON) * 10) / 10;
  if (change === "shorter") return Math.round((yieldInCup * 0.9 + Number.EPSILON) * 10) / 10;
  return yieldInCup;
}

export function preInfusionGuide(seconds) {
  if (seconds <= 0) return {
    label: "No intentional hold", heading: "0 seconds",
    detail: "Start with the machine’s normal ramp. Some machines already wet the puck or slowly build pressure even with no added hold. Use this as your comparison shot.",
  };
  return {
    label: "Trial duration", heading: "Compare with your usual setting",
    detail: "Seconds alone do not predict flavor or puck saturation. Keep pressure, dose, grind, yield and temperature fixed when comparing durations. Include any liquid released during pre-infusion in your final yield. Use the roast examples below only if your machine supports their pressure range.",
  };
}
