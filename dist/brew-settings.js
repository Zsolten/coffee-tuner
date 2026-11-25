export function setupBrewSettings() {
  const mobile = window.matchMedia("(max-width: 756px)");
  const toolbar = document.querySelector(".brew-recipe-toolbar");
  const picker = document.querySelector("#method, #aero-method");
  const pickerControl = picker.closest(".recipe-picker");
  const pickerPosition = document.createComment("Desktop recipe selector");
  pickerControl.before(pickerPosition);

  const sheet = document.getElementById("mobile-brew-settings");
  const openButton = document.getElementById("settings-toggle");
  const closeButton = document.getElementById("close-brew-settings");
  const settings = document.getElementById("brew-settings");
  const title = document.getElementById("settings-title");
  const recipe = document.querySelector(".recipe");
  const reset = document.getElementById("reset");
  const pageHeader = document.querySelector(".page-header");

  openButton.addEventListener("click", () => {
    pickerControl.append(picker);
    sheet.showModal();
  });
  sheet.addEventListener("close", () => {
    if (mobile.matches && !sheet.open) toolbar.prepend(picker);
  });
  closeButton.addEventListener("click", () => sheet.close());
  sheet.addEventListener("click", (event) => {
    if (event.target === sheet) sheet.close();
  });

  function positionSettings() {
    toolbar.hidden = !mobile.matches;
    if (mobile.matches) {
      if (!sheet.open) toolbar.prepend(picker);
      closeButton.before(title);
      sheet.append(settings);
      settings.prepend(pickerControl);
      closeButton.before(reset);
      return;
    }

    if (sheet.open) sheet.close();
    pickerControl.append(picker);
    pickerPosition.after(pickerControl);
    settings.prepend(title);
    recipe.before(settings);
    pageHeader.append(reset);
  }

  mobile.addEventListener("change", positionSettings);
  positionSettings();
}
