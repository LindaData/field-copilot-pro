import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./locales/en.json";
import es from "./locales/es.json";

export const LANGS = [
  { code: "en", label: "English", short: "EN" },
  { code: "es", label: "Español", short: "ES" },
] as const;

export type LangCode = (typeof LANGS)[number]["code"];

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: en },
        es: { translation: es },
      },
      fallbackLng: "en",
      supportedLngs: ["en", "es"],
      interpolation: { escapeValue: false },
      detection: {
        order: ["localStorage", "navigator"],
        lookupLocalStorage: "fc.lang",
        caches: ["localStorage"],
      },
      returnNull: false,
      saveMissing: import.meta.env.DEV,
      missingKeyHandler: (lngs, ns, key) => {
        if (import.meta.env.DEV) {
          console.warn(`[i18n] missing key "${key}" for ${lngs.join(",")}`);
        }
      },
    });
}

export default i18n;

export function setLanguage(code: LangCode) {
  i18n.changeLanguage(code);
  try {
    localStorage.setItem("fc.lang", code);
  } catch {
    /* ignore */
  }
}
