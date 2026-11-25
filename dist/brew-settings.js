export function setupBrewSettings() {
  const settingsToggle = document.getElementById("settings-toggle");
  settingsToggle.addEventListener("click", () => {
    const expanded = settingsToggle.getAttribute("aria-expanded") !== "true";
    settingsToggle.setAttribute("aria-expanded", String(expanded));
  });

  const mobileSettings = window.matchMedia("(max-width: 756px)");
  const settingsPanel = document.getElementById("brew-settings");
  const recipePanel = document.querySelector(".recipe");
  const resetButton = document.getElementById("reset");

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
}
