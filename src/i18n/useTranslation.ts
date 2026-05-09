import { useMemo } from "react";
import type { LanguageCode } from "./types";
import { translations } from "./translations";

function interpolate(text: string, params?: Record<string, string | number>): string {
  if (!params) return text;
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (key in params) return String(params[key]);
    return match;
  });
}

export function createTranslator(language: LanguageCode) {
  const lang = translations[language] || translations.en;
  const fallback = translations.en;

  return function t(key: string, params?: Record<string, string | number>): string {
    let text = lang[key];
    if (text === undefined) text = fallback[key];
    if (text === undefined) return key;
    return interpolate(text, params);
  };
}

export function useTranslation(language: LanguageCode = "en") {
  const t = useMemo(() => createTranslator(language), [language]);
  return { t, language };
}

export const LANGUAGE_NAMES: Record<LanguageCode, string> = {
  en: "English",
  vi: "Tiếng Việt",
  ko: "한국어",
  ja: "日本語",
};
