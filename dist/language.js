import { hungarian } from "./hungarian.js";

const storageKey = "brew-tools-language";
let language = "en";

export function translateMessage(locale, message, values = {}) {
  const localized = locale === "hu" && Object.hasOwn(hungarian, message) ? hungarian[message] : message;
  return localized.replace(/\{([a-z]+)\}/g, (token, key) => values[key] ?? token);
}

export function t(message, values) {
  return translateMessage(language, message, values);
}

export function formatNumber(value, maximumFractionDigits = 1) {
  return new Intl.NumberFormat(language, { maximumFractionDigits }).format(value);
}

export function initializeLanguage(render) {
  const picker = document.getElementById("app-language");
  const text = Array.from(document.querySelectorAll("[data-i18n]"), (element) => ({
    element,
    message: element.textContent.trim().replace(/\s+/g, " "),
  }));
  const attributes = Array.from(document.querySelectorAll("[data-i18n-attr]"), (element) => ({
    element,
    attribute: element.dataset.i18nAttr,
    message: element.getAttribute(element.dataset.i18nAttr),
  }));

  function apply(value) {
    language = value === "hu" ? "hu" : "en";
    document.documentElement.lang = language;
    picker.value = language;
    for (const entry of text) entry.element.textContent = t(entry.message);
    for (const entry of attributes) entry.element.setAttribute(entry.attribute, t(entry.message));
    render();
  }

  let saved;
  try {
    saved = localStorage.getItem(storageKey);
  } catch {
    // The picker also works without browser storage.
  }
  apply(saved);

  picker.addEventListener("change", () => {
    apply(picker.value);
    try {
      localStorage.setItem(storageKey, language);
    } catch {
      // The selection still applies to the current page.
    }
  });
}
