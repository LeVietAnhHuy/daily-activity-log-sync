const APP_SETTINGS_KEY = "spend-app-settings";

export const CURRENCY_OPTIONS = ["VND", "USD", "EUR", "JPY", "KRW"];

export const defaultAppSettings = {
  defaultCurrency: "VND",
  displayCurrency: "VND",
  locale: "en-US",
  appLanguage: "en",
  formatLocaleMode: "currency",
  autoMatchLanguageToCurrency: false,
  transactionDensity: "comfortable",
  theme: "default-dark",
  backgroundEffects: "on",
  themeIntensity: "medium",
  backgroundMotion: "on",
  autoReduceMotionInFullscreen: true,
  showHelpButtons: true,
  noSpendSettings: {
    countTodayInCurrentStreakPreview: true,
    excludeIncomeFromSpending: true,
    startTrackingFromFirstTransaction: false,
  },
  recurringPayments: {
    defaultReminderDaysBefore: 3,
    showOverdueFirst: true,
    showDashboardReminders: true,
  },
};

export function loadAppSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(APP_SETTINGS_KEY) || "{}");
    const legacyDisplayCurrency = localStorage.getItem("spend-currency");

    return {
      ...defaultAppSettings,
      ...stored,
      displayCurrency:
        stored.displayCurrency || legacyDisplayCurrency || defaultAppSettings.displayCurrency,
      defaultCurrency:
        stored.defaultCurrency || legacyDisplayCurrency || defaultAppSettings.defaultCurrency,
      appLanguage:
        stored.appLanguage && ["en", "vi", "ko", "ja"].includes(stored.appLanguage)
          ? stored.appLanguage
          : defaultAppSettings.appLanguage,
      formatLocaleMode:
        stored.formatLocaleMode === "language" || stored.formatLocaleMode === "currency"
          ? stored.formatLocaleMode
          : defaultAppSettings.formatLocaleMode,
      autoMatchLanguageToCurrency:
        typeof stored.autoMatchLanguageToCurrency === "boolean"
          ? stored.autoMatchLanguageToCurrency
          : defaultAppSettings.autoMatchLanguageToCurrency,
      showHelpButtons:
        typeof stored.showHelpButtons === "boolean"
          ? stored.showHelpButtons
          : defaultAppSettings.showHelpButtons,
      noSpendSettings: {
        ...defaultAppSettings.noSpendSettings,
        ...(stored.noSpendSettings || {}),
      },
      recurringPayments: {
        ...defaultAppSettings.recurringPayments,
        ...(stored.recurringPayments || {}),
      },
    };
  } catch {
    return defaultAppSettings;
  }
}

export function saveAppSettings(settings) {
  localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(settings));
  localStorage.setItem("spend-currency", settings.displayCurrency);
  // Dispatch event so other tabs can react
  const event = new CustomEvent("daily-log-settings-changed", { detail: settings });
  window.dispatchEvent(event);
}
