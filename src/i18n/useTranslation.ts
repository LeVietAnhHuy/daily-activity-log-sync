// Translation hook and utilities for the Daily Log app

import { useMemo } from "react";
import type { LanguageCode, TranslationKey } from "./types";
import { translations } from "./translations";

/**
 * Currency to locale mapping for formatting and suggestions.
 * This is only used for formatting and auto-match suggestions.
 * It does NOT force language changes unless autoMatchLanguageToCurrency is enabled.
 */
export const CURRENCY_LOCALE_MAP: Record<string, { locale: string; suggestedLanguage: LanguageCode; symbol: string }> = {
  VND: {
    locale: "vi-VN",
    suggestedLanguage: "vi",
    symbol: "₫",
  },
  KRW: {
    locale: "ko-KR",
    suggestedLanguage: "ko",
    symbol: "₩",
  },
  USD: {
    locale: "en-US",
    suggestedLanguage: "en",
    symbol: "$",
  },
  EUR: {
    locale: "en-GB",
    suggestedLanguage: "en",
    symbol: "€",
  },
  JPY: {
    locale: "ja-JP",
    suggestedLanguage: "en",
    symbol: "¥",
  },
  CNY: {
    locale: "zh-CN",
    suggestedLanguage: "en",
    symbol: "¥",
  },
  GBP: {
    locale: "en-GB",
    suggestedLanguage: "en",
    symbol: "£",
  },
};

/**
 * Get the locale to use for formatting based on settings.
 * 
 * Rules:
 * - If formatLocaleMode === "language": use locale from appLanguage
 * - If formatLocaleMode === "currency": use locale from displayCurrency
 * - Fallback: return "en-US"
 */
export function getAppLocale(settings: {
  formatLocaleMode?: "language" | "currency";
  appLanguage?: LanguageCode;
  displayCurrency?: string;
}): string {
  if (!settings) return "en-US";

  const mode = settings.formatLocaleMode || "currency";

  if (mode === "language") {
    const lang = settings.appLanguage || "en";
    switch (lang) {
      case "vi":
        return "vi-VN";
      case "ko":
        return "ko-KR";
      default:
        return "en-US";
    }
  }

  // mode === "currency"
  const currency = settings.displayCurrency || "VND";
  const mapping = CURRENCY_LOCALE_MAP[currency];
  return mapping?.locale || "en-US";
}

/**
 * Get suggested language based on display currency.
 * Used when autoMatchLanguageToCurrency is enabled.
 */
export function getSuggestedLanguageForCurrency(currency: string): LanguageCode | null {
  const mapping = CURRENCY_LOCALE_MAP[currency];
  return mapping?.suggestedLanguage || null;
}

/**
 * Interpolate parameters into a translation string.
 * Example: t("budget.usedPercent", { percent: 82 })
 */
function interpolate(text: string, params?: Record<string, string | number>): string {
  if (!params) return text;

  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (key in params) {
      return String(params[key]);
    }
    return match;
  });
}

/**
 * Create a translation function for the given language.
 * Falls back to English if a key is missing.
 */
export function createTranslator(language: LanguageCode) {
  const langTranslations = translations[language];
  const fallbackTranslations = translations.en;

  return function t(key: TranslationKey, params?: Record<string, string | number>): string {
    let text = langTranslations[key];

    // Fallback to English if key is missing
    if (text === undefined) {
      text = fallbackTranslations[key];
    }

    // If still undefined, return the key itself
    if (text === undefined) {
      return key;
    }

    return interpolate(text, params);
  };
}

/**
 * React hook for translations.
 * Returns a translation function and the current language.
 * 
 * Usage:
 * const { t, language } = useTranslation(appSettings.appLanguage);
 */
export function useTranslation(language: LanguageCode = "en") {
  const t = useMemo(() => createTranslator(language), [language]);
  return { t, language };
}

/**
 * Default app settings for language-related options.
 */
export const DEFAULT_LANGUAGE_SETTINGS = {
  appLanguage: "en" as LanguageCode,
  formatLocaleMode: "currency" as "language" | "currency",
  autoMatchLanguageToCurrency: false,
};

/**
 * Language display names for UI.
 */
export const LANGUAGE_NAMES: Record<LanguageCode, string> = {
  en: "English",
  vi: "Tiếng Việt",
  ko: "한국어",
};
