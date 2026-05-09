import { CURRENCY_OPTIONS } from "./settingsManager";

export default function SettingsPanel({
  settings,
  onChange,
  onNoSpendChange,
  onRecurringChange,
  onClose,
  t,
}) {
  return (
    <section className="spend-settings-panel" aria-label="Spending preferences">
      <div className="spend-settings-header">
        <div>
          <span className="spend-section-kicker">{t("settings.preferences")}</span>
          <h2>{t("settings.title")}</h2>
        </div>
        <button type="button" className="secondary-action-btn" onClick={onClose}>
          {t("settings.close")}
        </button>
      </div>

      {/* Appearance Section */}
      <div className="spend-settings-section">
        <h3 className="spend-settings-section-title">{t("settings.appearance")}</h3>
        <div className="spend-settings-grid">
          <label className="spend-field">
            <span>{t("settings.theme")}</span>
            <select
              value={settings.theme}
              onChange={(event) => onChange("theme", event.target.value)}
            >
              <option value="default-dark">{t("settings.themeDark")}</option>
              <option value="anime-dark">{t("settings.themeAnime")}</option>
            </select>
          </label>

          <label className="spend-field">
            <span>{t("settings.bgEffects")}</span>
            <select
              value={settings.backgroundEffects || settings.backgroundMotion}
              onChange={(event) => onChange("backgroundEffects", event.target.value)}
            >
              <option value="on">{t("settings.bgOn")}</option>
              <option value="reduced">{t("settings.bgReduced")}</option>
              <option value="off">{t("settings.bgOff")}</option>
            </select>
          </label>

          <label className="spend-field">
            <span>{t("settings.themeIntensity")}</span>
            <select
              value={settings.themeIntensity}
              onChange={(event) => onChange("themeIntensity", event.target.value)}
            >
              <option value="low">{t("settings.intensityLow")}</option>
              <option value="medium">{t("settings.intensityMedium")}</option>
              <option value="high">{t("settings.intensityHigh")}</option>
            </select>
          </label>

          <label className="spend-field">
            <span>{t("settings.transactionView")}</span>
            <select
              value={settings.transactionDensity}
              onChange={(event) =>
                onChange("transactionDensity", event.target.value)
              }
            >
              <option value="comfortable">{t("settings.comfortable")}</option>
              <option value="compact">{t("settings.compact")}</option>
            </select>
          </label>

          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={settings.autoReduceMotionInFullscreen !== false}
              onChange={(event) =>
                onChange("autoReduceMotionInFullscreen", event.target.checked)
              }
            />
            <span>{t("settings.autoReduceMotion")}</span>
          </label>

          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={settings.showHelpButtons}
              onChange={(event) => onChange("showHelpButtons", event.target.checked)}
            />
            <span>{t("settings.showHelpButtons")}</span>
          </label>
        </div>
      </div>

      {/* Language Section */}
      <div className="spend-settings-section">
        <h3 className="spend-settings-section-title">{t("settings.language")}</h3>
        <div className="spend-settings-grid">
          <label className="spend-field">
            <span>{t("settings.appLanguage")}</span>
            <select
              value={settings.appLanguage}
              onChange={(event) => onChange("appLanguage", event.target.value)}
            >
              <option value="en">{t("lang.en")}</option>
              <option value="vi">{t("lang.vi")}</option>
              <option value="ko">{t("lang.ko")}</option>
              <option value="ja">{t("lang.ja")}</option>
            </select>
          </label>

          <label className="spend-field">
            <span>{t("settings.formatLocaleMode")}</span>
            <select
              value={settings.formatLocaleMode}
              onChange={(event) => onChange("formatLocaleMode", event.target.value)}
            >
              <option value="language">{t("settings.formatFollowLang")}</option>
              <option value="currency">{t("settings.formatFollowCurrency")}</option>
            </select>
          </label>

          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={settings.autoMatchLanguageToCurrency}
              onChange={(event) => {
                const newValue = event.target.checked;
                onChange("autoMatchLanguageToCurrency", newValue);
                if (newValue) {
                  const currency = settings.displayCurrency || "VND";
                  const localeMap = {
                    VND: "vi",
                    KRW: "ko",
                    USD: "en",
                    EUR: "en",
                    JPY: "ja",
                    CNY: "en",
                    GBP: "en",
                  };
                  const suggestedLang = localeMap[currency] || "en";
                  onChange("appLanguage", suggestedLang);
                }
              }}
            />
            <span>{t("settings.autoMatchLang")}</span>
          </label>
        </div>
      </div>

      {/* Currency Section */}
      <div className="spend-settings-section">
        <h3 className="spend-settings-section-title">{t("settings.currency")}</h3>
        <div className="spend-settings-grid">
          <label className="spend-field">
            <span>{t("settings.defaultCurrency")}</span>
            <select
              value={settings.defaultCurrency}
              onChange={(event) => onChange("defaultCurrency", event.target.value)}
            >
              {CURRENCY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="spend-field">
            <span>{t("settings.displayCurrency")}</span>
            <select
              value={settings.displayCurrency}
              onChange={(event) => {
                const newCurrency = event.target.value;
                onChange("displayCurrency", newCurrency);
                if (settings.autoMatchLanguageToCurrency) {
                  const localeMap = {
                    VND: "vi",
                    KRW: "ko",
                    USD: "en",
                    EUR: "en",
                    JPY: "ja",
                    CNY: "en",
                    GBP: "en",
                  };
                  const suggestedLang = localeMap[newCurrency] || "en";
                  onChange("appLanguage", suggestedLang);
                }
              }}
            >
              {CURRENCY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* No-Spend Settings Section */}
      <div className="spend-settings-section">
        <h3 className="spend-settings-section-title">{t("settings.noSpendTracker")}</h3>
        <div className="spend-settings-grid">
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={settings.noSpendSettings.countTodayInCurrentStreakPreview}
              onChange={(event) =>
                onNoSpendChange("countTodayInCurrentStreakPreview", event.target.checked)
              }
            />
            <span>{t("settings.noSpendPreview")}</span>
          </label>

          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={settings.noSpendSettings.excludeIncomeFromSpending}
              onChange={(event) =>
                onNoSpendChange("excludeIncomeFromSpending", event.target.checked)
              }
            />
            <span>{t("settings.noSpendExcludeIncome")}</span>
          </label>

          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={settings.noSpendSettings.startTrackingFromFirstTransaction}
              onChange={(event) =>
                onNoSpendChange("startTrackingFromFirstTransaction", event.target.checked)
              }
            />
            <span>{t("settings.noSpendStartFirst")}</span>
          </label>
        </div>
      </div>

      {/* Recurring Payments Settings Section */}
      <div className="spend-settings-section">
        <h3 className="spend-settings-section-title">{t("settings.billsSection")}</h3>
        <div className="spend-settings-grid">
          <label className="spend-field">
            <span>{t("settings.defaultReminder")}</span>
            <input
              type="number"
              min="0"
              step="1"
              value={settings.recurringPayments.defaultReminderDaysBefore}
              onChange={(event) =>
                onRecurringChange(
                  "defaultReminderDaysBefore",
                  Math.max(0, Number(event.target.value || 0))
                )
              }
            />
          </label>

          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={settings.recurringPayments.showOverdueFirst}
              onChange={(event) =>
                onRecurringChange("showOverdueFirst", event.target.checked)
              }
            />
            <span>{t("settings.showOverdue")}</span>
          </label>

          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={settings.recurringPayments.showDashboardReminders}
              onChange={(event) =>
                onRecurringChange("showDashboardReminders", event.target.checked)
              }
            />
            <span>{t("settings.showReminders")}</span>
          </label>
        </div>
      </div>
    </section>
  );
}
