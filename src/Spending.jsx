import { useState, useEffect, useMemo, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./Spending.css";
import HelpButton from "./HelpButton";
import { HELP_TEXT } from "./spendingHelpText";
import {
  DEFAULT_CATEGORIES,
  PAYMENT_METHODS,
  PERIOD_OPTIONS,
  RECURRENCE_OPTIONS,
  calculateNoSpendSummary,
  calculateBudgetProgress,
  calculateInsights,
  calculateNextDueDate,
  cleanCurrencyFromText,
  createTransactionFromRecurringPayment,
  filterSpendLogs,
  formatCurrency as formatBaseCurrency,
  getLocalDateKey,
  getMonthlyProjectedSpending,
  getNoSpendMonthCalendar,
  fromBaseAmount,
  getLogsForPeriod,
  getPreviousPeriodLogs,
  getUpcomingRecurringPayments,
  normalizeRecurringPayment,
  normalizeSpendLog,
  parseTags,
  toBaseAmount,
} from "./spendingUtils";

const MONTHLY_BUDGET_KEY = "spend-monthly-budget-base";
const APP_SETTINGS_KEY = "spend-app-settings";
const RECURRING_PAYMENTS_KEY = "spend-recurring-payments";
const LEGACY_RECURRING_MIGRATION_KEY = "spend-recurring-payments-migrated-v1";
const SETTINGS_EVENT = "daily-log-settings-changed";

const CURRENCY_OPTIONS = ["VND", "USD", "EUR", "JPY", "KRW"];
const LOCALE_OPTIONS = [
  { value: "en-US", label: "English" },
  { value: "vi-VN", label: "Vietnamese" },
  { value: "ko-KR", label: "Korean" },
];

const FREQUENCY_LABELS = {
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
  custom: "Custom",
};

const DUE_STATUS_LABELS = {
  overdue: "Overdue",
  today: "Today",
  soon: "Soon",
  later: "Later",
  paused: "Paused",
  ended: "Ended",
};

const RECURRING_GROUP_ORDER = ["overdue", "today", "soon", "later", "paused", "ended"];

const defaultAppSettings = {
  defaultCurrency: "VND",
  displayCurrency: "VND",
  locale: "en-US",
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
    startTrackingFromFirstTransaction: true,
  },
  recurringPayments: {
    defaultReminderDaysBefore: 3,
    showOverdueFirst: true,
    showDashboardReminders: true,
  },
};

function loadAppSettings() {
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

function saveAppSettings(settings) {
  localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(settings));
  localStorage.setItem("spend-currency", settings.displayCurrency);
  window.dispatchEvent(new CustomEvent(SETTINGS_EVENT, { detail: settings }));
}

function createEmptyForm(currency = "VND") {
  return {
    amount: "",
    currency,
    productName: "",
    category: "Other",
    tags: "",
    paymentMethod: "Cash",
    note: "",
    isRecurring: false,
    recurrenceInterval: "monthly",
  };
}

function createRecurringId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `recurring-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function localDateKeyToDate(dateKey) {
  const [year, month, day] = String(dateKey || getLocalDateKey(new Date()))
    .split("-")
    .map(Number);
  return new Date(year, month - 1, day);
}

function createEmptyRecurringForm(settings = defaultAppSettings) {
  const todayKey = getLocalDateKey(new Date());

  return {
    name: "",
    amount: "",
    currency: settings.defaultCurrency || "VND",
    category: "Bills",
    paymentMethod: "Card",
    frequency: "monthly",
    startDate: localDateKeyToDate(todayKey),
    nextDueDate: localDateKeyToDate(todayKey),
    reminderDaysBefore:
      settings.recurringPayments?.defaultReminderDaysBefore ??
      defaultAppSettings.recurringPayments.defaultReminderDaysBefore,
    tags: "",
    note: "",
    status: "active",
  };
}

function createRecurringFormFromPayment(payment) {
  const entry = normalizeRecurringPayment(payment);

  return {
    name: entry.name,
    amount: formatDraftAmount(entry.amount),
    currency: entry.currency || "VND",
    category: entry.category || "Other",
    paymentMethod: entry.paymentMethod || "Cash",
    frequency: entry.frequency || "monthly",
    startDate: localDateKeyToDate(entry.startDate),
    nextDueDate: localDateKeyToDate(entry.nextDueDate),
    reminderDaysBefore: entry.reminderDaysBefore,
    tags: entry.tags.join(", "),
    note: entry.note || "",
    status: entry.status || "active",
  };
}

function loadRecurringPayments() {
  try {
    const stored = JSON.parse(localStorage.getItem(RECURRING_PAYMENTS_KEY) || "[]");
    return Array.isArray(stored)
      ? stored.map(normalizeRecurringPayment).filter((payment) => payment.id)
      : [];
  } catch {
    return [];
  }
}

const emptyFilters = {
  query: "",
  period: "all",
  category: "All",
  tag: "All",
  paymentMethod: "All",
};

function getTimeValue(date) {
  const value = new Date(date);
  return `${String(value.getHours()).padStart(2, "0")}:${String(
    value.getMinutes()
  ).padStart(2, "0")}`;
}

function applyTime(date, timeValue) {
  const next = new Date(date);
  const [hours, minutes] = timeValue.split(":").map(Number);
  if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
    next.setHours(hours, minutes, 0, 0);
  }
  return next;
}

function formatDraftAmount(value) {
  if (!value) return "";
  return String(Math.round(value * 100) / 100);
}

function createFormFromLog(log) {
  const entry = normalizeSpendLog(log);
  const entryDate = new Date(entry.timestamp);

  return {
    amount: formatDraftAmount(entry.original_amount),
    currency: entry.currency || "VND",
    productName: entry.product_name,
    category: entry.category || "Other",
    tags: entry.tags.join(", "),
    paymentMethod: entry.payment_method || "Cash",
    note: entry.note || "",
    isRecurring: entry.is_recurring,
    recurrenceInterval: entry.recurrence_interval || "monthly",
    date: entryDate,
    time: getTimeValue(entryDate),
  };
}

function validateExpenseDraft(draft) {
  const amount = Number(draft.amount);

  if (!draft.productName.trim()) {
    return { error: "Description is required." };
  }

  if (Number.isNaN(amount) || amount <= 0) {
    return { error: "Amount must be a positive number." };
  }

  return { amount };
}

function buildSpendPayloadFromDraft(draft, timestamp) {
  const originalAmount = Number(draft.amount);
  const transactionCurrency = draft.currency || "VND";
  const isRecurring = Boolean(draft.isRecurring);

  return {
    amount: toBaseAmount(originalAmount, transactionCurrency),
    productName: draft.productName.trim(),
    timestamp,
    currency: transactionCurrency,
    originalAmount,
    category: cleanCurrencyFromText(draft.category, "Other"),
    tags: parseTags(draft.tags),
    paymentMethod: cleanCurrencyFromText(draft.paymentMethod, "Cash"),
    note: draft.note.trim() || null,
    isRecurring,
    recurrenceInterval: isRecurring ? draft.recurrenceInterval : null,
  };
}

function validateRecurringDraft(draft) {
  const amount = Number(draft.amount);

  if (!draft.name.trim()) {
    return { error: "Payment name is required." };
  }

  if (Number.isNaN(amount) || amount <= 0) {
    return { error: "Amount must be a positive number." };
  }

  return { amount };
}

function buildRecurringPaymentFromDraft(draft, existingPayment = null) {
  const now = new Date().toISOString();
  const existing = existingPayment ? normalizeRecurringPayment(existingPayment) : null;

  return normalizeRecurringPayment({
    id: existing?.id || createRecurringId(),
    name: draft.name.trim(),
    amount: Number(draft.amount),
    currency: draft.currency || "VND",
    category: cleanCurrencyFromText(draft.category, "Other"),
    paymentMethod: cleanCurrencyFromText(draft.paymentMethod, "Cash"),
    frequency: draft.frequency || "monthly",
    interval: 1,
    startDate: getLocalDateKey(draft.startDate || new Date()),
    nextDueDate: getLocalDateKey(draft.nextDueDate || draft.startDate || new Date()),
    note: draft.note.trim(),
    tags: parseTags(draft.tags),
    status: draft.status || existing?.status || "active",
    reminderDaysBefore: Number(draft.reminderDaysBefore || 0),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  });
}

function SectionHeader({ kicker, title, helpKey, showHelp }) {
  const help = HELP_TEXT[helpKey];

  return (
    <div className="spend-section-header">
      {kicker && <span className="spend-section-kicker">{kicker}</span>}
      <div className="spend-title-with-help">
        <h2>{title}</h2>
        {showHelp && help && (
          <HelpButton
            title={help.title}
            body={help.body}
            ariaLabel={`Explain ${title}`}
          />
        )}
      </div>
    </div>
  );
}

function FieldHelpLabel({ htmlFor, label, helpKey, showHelp }) {
  const help = HELP_TEXT[helpKey];

  return (
    <div className="spend-field-label">
      <label htmlFor={htmlFor}>{label}</label>
      {showHelp && help && (
        <HelpButton
          title={help.title}
          body={help.body}
          ariaLabel={`Explain ${label}`}
        />
      )}
    </div>
  );
}

function InlineTransactionEditor({
  log,
  draft,
  showHelp,
  onChange,
  onSave,
  onCancel,
}) {
  const fieldId = (name) => `edit-${log.id}-${name}`;

  return (
    <form
      className="spend-item-edit"
      onSubmit={(event) => onSave(event, log)}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
        }
      }}
    >
      <div className="inline-edit-grid">
        <label className="spend-field">
          <span>Amount</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={draft.amount}
            onChange={(event) => onChange("amount", event.target.value)}
            required
          />
        </label>

        <label className="spend-field">
          <span>Currency</span>
          <select
            value={draft.currency}
            onChange={(event) => onChange("currency", event.target.value)}
          >
            {CURRENCY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="spend-field inline-edit-description">
          <span>Description</span>
          <input
            type="text"
            value={draft.productName}
            onChange={(event) => onChange("productName", event.target.value)}
            required
          />
        </label>

        <div className="spend-field">
          <FieldHelpLabel
            htmlFor={fieldId("category")}
            label="Category"
            helpKey="category"
            showHelp={showHelp}
          />
          <select
            id={fieldId("category")}
            value={draft.category}
            onChange={(event) => onChange("category", event.target.value || "Other")}
            required
          >
            {DEFAULT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div className="spend-field">
          <FieldHelpLabel
            htmlFor={fieldId("payment")}
            label="Payment Method"
            helpKey="paymentMethod"
            showHelp={showHelp}
          />
          <select
            id={fieldId("payment")}
            value={draft.paymentMethod}
            onChange={(event) => onChange("paymentMethod", event.target.value)}
          >
            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </div>

        <label className="spend-field">
          <span>Date</span>
          <DatePicker
            selected={draft.date}
            onChange={(date) => onChange("date", date || new Date(log.timestamp))}
            dateFormat="MM/dd/yyyy"
            className="spend-datepicker-input"
          />
        </label>

        <label className="spend-field">
          <span>Time</span>
          <input
            type="time"
            value={draft.time}
            onChange={(event) => onChange("time", event.target.value)}
          />
        </label>

        <div className="spend-field inline-edit-tags">
          <FieldHelpLabel
            htmlFor={fieldId("tags")}
            label="Tags"
            helpKey="tags"
            showHelp={showHelp}
          />
          <input
            id={fieldId("tags")}
            type="text"
            value={draft.tags}
            onChange={(event) => onChange("tags", event.target.value)}
            placeholder="work, weekend, subscription"
          />
        </div>

        <label className="spend-field inline-edit-note">
          <span>Note</span>
          <input
            type="text"
            value={draft.note}
            onChange={(event) => onChange("note", event.target.value)}
            placeholder="Optional context"
          />
        </label>
      </div>

      <div className="inline-edit-footer">
        <div className="recurring-control">
          <label className="recurring-toggle">
            <input
              type="checkbox"
              checked={draft.isRecurring}
              onChange={(event) => onChange("isRecurring", event.target.checked)}
            />
            <span>Recurring payment</span>
          </label>
          {showHelp && (
            <HelpButton
              title={HELP_TEXT.recurring.title}
              body={HELP_TEXT.recurring.body}
              ariaLabel="Explain Recurring Payment"
            />
          )}
        </div>

        {draft.isRecurring && (
          <label className="spend-field spend-field--compact">
            <span>Repeats</span>
            <select
              value={draft.recurrenceInterval}
              onChange={(event) =>
                onChange("recurrenceInterval", event.target.value)
              }
            >
              {RECURRENCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="spend-item-actions inline-edit-actions">
          <button type="submit">Save</button>
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}

function SettingsPanel({
  settings,
  onChange,
  onNoSpendChange,
  onRecurringChange,
  onClose,
}) {
  return (
    <section className="spend-settings-panel" aria-label="Spending preferences">
      <div className="spend-settings-header">
        <div>
          <span className="spend-section-kicker">Preferences</span>
          <h2>Settings</h2>
        </div>
        <button type="button" className="secondary-action-btn" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="spend-settings-grid">
        <label className="spend-field">
          <span>Default Currency</span>
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
          <span>Display Currency</span>
          <select
            value={settings.displayCurrency}
            onChange={(event) => onChange("displayCurrency", event.target.value)}
          >
            {CURRENCY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="spend-field">
          <span>Locale / Number Format</span>
          <select
            value={settings.locale}
            onChange={(event) => onChange("locale", event.target.value)}
          >
            {LOCALE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="spend-field">
          <span>Transaction View</span>
          <select
            value={settings.transactionDensity}
            onChange={(event) =>
              onChange("transactionDensity", event.target.value)
            }
          >
            <option value="comfortable">Comfortable</option>
            <option value="compact">Compact</option>
          </select>
        </label>

        <label className="spend-field">
          <span>Theme</span>
          <select
            value={settings.theme}
            onChange={(event) => onChange("theme", event.target.value)}
          >
            <option value="default-dark">Default Dark</option>
            <option value="anime-dark">Anime Dark Fantasy</option>
          </select>
        </label>

        <label className="spend-field">
          <span>Background Effects</span>
          <select
            value={settings.backgroundEffects || settings.backgroundMotion}
            onChange={(event) => onChange("backgroundEffects", event.target.value)}
          >
            <option value="on">On</option>
            <option value="reduced">Reduced</option>
            <option value="off">Off</option>
          </select>
        </label>

        <label className="spend-field">
          <span>Theme Intensity</span>
          <select
            value={settings.themeIntensity}
            onChange={(event) => onChange("themeIntensity", event.target.value)}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
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
          <span>Auto reduce motion in fullscreen</span>
        </label>

        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={settings.showHelpButtons}
            onChange={(event) => onChange("showHelpButtons", event.target.checked)}
          />
          <span>Show help buttons</span>
        </label>

        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={settings.noSpendSettings.countTodayInCurrentStreakPreview}
            onChange={(event) =>
              onNoSpendChange("countTodayInCurrentStreakPreview", event.target.checked)
            }
          />
          <span>Preview today in no-spend status</span>
        </label>

        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={settings.noSpendSettings.excludeIncomeFromSpending}
            onChange={(event) =>
              onNoSpendChange("excludeIncomeFromSpending", event.target.checked)
            }
          />
          <span>Income does not break streak</span>
        </label>

        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={settings.noSpendSettings.startTrackingFromFirstTransaction}
            onChange={(event) =>
              onNoSpendChange("startTrackingFromFirstTransaction", event.target.checked)
            }
          />
          <span>Start from first logged transaction</span>
        </label>

        <label className="spend-field">
          <span>Default Reminder Days</span>
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
          <span>Show overdue payments first</span>
        </label>

        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={settings.recurringPayments.showDashboardReminders}
            onChange={(event) =>
              onRecurringChange("showDashboardReminders", event.target.checked)
            }
          />
          <span>Show bill reminders on dashboard</span>
        </label>
      </div>
    </section>
  );
}

function RecurringPaymentForm({
  draft,
  isEditing,
  showHelp,
  onChange,
  onSubmit,
  onCancel,
}) {
  return (
    <form className="recurring-payment-form" onSubmit={onSubmit}>
      <div className="recurring-form-header">
        <div>
          <span className="spend-section-kicker">
            {isEditing ? "Edit plan" : "New plan"}
          </span>
          <h3>{isEditing ? "Edit Recurring Payment" : "Add Recurring Payment"}</h3>
        </div>
        <button type="button" className="secondary-action-btn" onClick={onCancel}>
          Cancel
        </button>
      </div>

      <div className="recurring-form-grid">
        <label className="spend-field recurring-field-wide">
          <span>Name</span>
          <input
            type="text"
            value={draft.name}
            onChange={(event) => onChange("name", event.target.value)}
            placeholder="Netflix, rent, phone bill"
            required
          />
        </label>

        <label className="spend-field">
          <span>Amount</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={draft.amount}
            onChange={(event) => onChange("amount", event.target.value)}
            required
          />
        </label>

        <label className="spend-field">
          <span>Currency</span>
          <select
            value={draft.currency}
            onChange={(event) => onChange("currency", event.target.value)}
          >
            {CURRENCY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <div className="spend-field">
          <FieldHelpLabel
            htmlFor="recurring-category"
            label="Category"
            helpKey="category"
            showHelp={showHelp}
          />
          <select
            id="recurring-category"
            value={draft.category}
            onChange={(event) => onChange("category", event.target.value || "Other")}
          >
            {DEFAULT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div className="spend-field">
          <FieldHelpLabel
            htmlFor="recurring-payment-method"
            label="Payment Method"
            helpKey="paymentMethod"
            showHelp={showHelp}
          />
          <select
            id="recurring-payment-method"
            value={draft.paymentMethod}
            onChange={(event) => onChange("paymentMethod", event.target.value)}
          >
            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </div>

        <label className="spend-field">
          <span>Frequency</span>
          <select
            value={draft.frequency}
            onChange={(event) => onChange("frequency", event.target.value)}
          >
            {RECURRENCE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="spend-field">
          <span>Start Date</span>
          <DatePicker
            selected={draft.startDate}
            onChange={(date) => onChange("startDate", date || new Date())}
            dateFormat="MM/dd/yyyy"
            className="spend-datepicker-input"
          />
        </label>

        <label className="spend-field">
          <span>Next Due Date</span>
          <DatePicker
            selected={draft.nextDueDate}
            onChange={(date) => onChange("nextDueDate", date || new Date())}
            dateFormat="MM/dd/yyyy"
            className="spend-datepicker-input"
          />
        </label>

        <label className="spend-field">
          <span>Reminder Days Before</span>
          <input
            type="number"
            min="0"
            step="1"
            value={draft.reminderDaysBefore}
            onChange={(event) =>
              onChange("reminderDaysBefore", event.target.value)
            }
          />
        </label>

        <div className="spend-field recurring-field-wide">
          <FieldHelpLabel
            htmlFor="recurring-tags"
            label="Tags"
            helpKey="tags"
            showHelp={showHelp}
          />
          <input
            id="recurring-tags"
            type="text"
            value={draft.tags}
            onChange={(event) => onChange("tags", event.target.value)}
            placeholder="subscription, essential, family"
          />
        </div>

        <label className="spend-field recurring-field-wide">
          <span>Note</span>
          <input
            type="text"
            value={draft.note}
            onChange={(event) => onChange("note", event.target.value)}
            placeholder="Optional context"
          />
        </label>

        {isEditing && (
          <label className="spend-field">
            <span>Status</span>
            <select
              value={draft.status}
              onChange={(event) => onChange("status", event.target.value)}
            >
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="ended">Ended</option>
            </select>
          </label>
        )}
      </div>

      <div className="recurring-form-actions">
        <button type="submit" className="spend-submit-btn">
          {isEditing ? "Save Changes" : "Add Recurring Payment"}
        </button>
      </div>
    </form>
  );
}

function RecurringPaymentItem({
  payment,
  showHelp,
  formatMoney,
  formatDateKey,
  onMarkPaid,
  onSkip,
  onEdit,
  onPause,
  onDelete,
}) {
  const days = payment.daysUntil;
  const dueCopy =
    payment.dueStatus === "paused"
      ? "Paused"
      : payment.dueStatus === "ended"
        ? "Ended"
        : days < 0
          ? `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`
          : days === 0
            ? "Due today"
            : days <= 7
              ? `Due in ${days} day${days === 1 ? "" : "s"}`
              : `Due ${formatDateKey(payment.nextDueDate)}`;

  return (
    <article className={`recurring-payment-item is-${payment.dueStatus}`}>
      <div className="recurring-payment-main">
        <div className="recurring-payment-title-row">
          <strong>{payment.name}</strong>
          <span className={`due-status-chip due-status-chip--${payment.dueStatus}`}>
            {DUE_STATUS_LABELS[payment.dueStatus] || payment.dueStatus}
          </span>
          {payment.reminderActive && (
            <span className="reminder-chip">Reminder active</span>
          )}
        </div>
        <div className="recurring-payment-meta">
          <span className="category-chip">{payment.category}</span>
          <span>{payment.paymentMethod}</span>
          <span>{FREQUENCY_LABELS[payment.frequency] || payment.frequency}</span>
          <span>Next: {formatDateKey(payment.nextDueDate)}</span>
        </div>
        {payment.tags.length > 0 && (
          <div className="tag-list" aria-label="Recurring payment tags">
            {payment.tags.map((tag) => (
              <span key={tag} className="tag-chip">
                {tag}
              </span>
            ))}
          </div>
        )}
        {payment.note && <p className="recurring-payment-note">{payment.note}</p>}
      </div>

      <div className="recurring-payment-side">
        <strong>{formatMoney(toBaseAmount(payment.amount, payment.currency))}</strong>
        <span>{dueCopy}</span>
      </div>

      <div className="recurring-payment-actions">
        {payment.status === "active" && (
          <>
            <button type="button" onClick={() => onMarkPaid(payment)}>
              Mark as Paid
            </button>
            {showHelp && (
              <HelpButton
                title={HELP_TEXT.markRecurringPaid.title}
                body={HELP_TEXT.markRecurringPaid.body}
                ariaLabel="Explain Mark as Paid"
              />
            )}
            <button type="button" onClick={() => onSkip(payment)}>
              Skip This Time
            </button>
            {showHelp && (
              <HelpButton
                title={HELP_TEXT.skipRecurringPayment.title}
                body={HELP_TEXT.skipRecurringPayment.body}
                ariaLabel="Explain Skip This Time"
              />
            )}
          </>
        )}
        <button type="button" onClick={() => onEdit(payment)}>
          Edit
        </button>
        <button type="button" onClick={() => onPause(payment)}>
          {payment.status === "paused" ? "Resume" : "Pause"}
        </button>
        <button type="button" onClick={() => onDelete(payment)}>
          Delete
        </button>
      </div>
    </article>
  );
}

export default function Spending() {
  const [settings, setSettings] = useState(loadAppSettings);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [form, setForm] = useState(() =>
    createEmptyForm(loadAppSettings().defaultCurrency)
  );
  const [isPastDate, setIsPastDate] = useState(false);
  const [dateOverride, setDateOverride] = useState(null);
  const displayCurrency = settings.displayCurrency;
  const [aggregates, setAggregates] = useState({
    daily: 0,
    weekly: 0,
    monthly: 0,
  });
  const [history, setHistory] = useState([]);
  const [filters, setFilters] = useState(emptyFilters);
  const [editingTransactionId, setEditingTransactionId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [undoEntry, setUndoEntry] = useState(null);
  const [monthlyBudgetBase, setMonthlyBudgetBase] = useState(() =>
    Number(localStorage.getItem(MONTHLY_BUDGET_KEY) || 0)
  );
  const [budgetDraft, setBudgetDraft] = useState("");
  const [recurringPayments, setRecurringPayments] = useState(loadRecurringPayments);
  const [isRecurringFormOpen, setIsRecurringFormOpen] = useState(false);
  const [editingRecurringPaymentId, setEditingRecurringPaymentId] = useState(null);
  const [recurringForm, setRecurringForm] = useState(() =>
    createEmptyRecurringForm(loadAppSettings())
  );
  const [timeInput, setTimeInput] = useState(() => getTimeValue(new Date()));
  const amountRef = useRef(null);
  const undoTimerRef = useRef(null);

  useEffect(() => {
    fetchData();
    amountRef.current?.focus();

    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  useEffect(() => {
    saveAppSettings(settings);
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(RECURRING_PAYMENTS_KEY, JSON.stringify(recurringPayments));
  }, [recurringPayments]);

  useEffect(() => {
    setBudgetDraft(
      monthlyBudgetBase > 0
        ? formatDraftAmount(fromBaseAmount(monthlyBudgetBase, displayCurrency))
        : ""
    );
  }, [displayCurrency, monthlyBudgetBase]);

  const normalizedHistory = useMemo(
    () =>
      history
        .map(normalizeSpendLog)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
    [history]
  );

  useEffect(() => {
    if (
      normalizedHistory.length === 0 ||
      localStorage.getItem(LEGACY_RECURRING_MIGRATION_KEY)
    ) {
      return;
    }

    const legacyTemplates = normalizedHistory
      .filter((log) => log.is_recurring)
      .map((log) =>
        normalizeRecurringPayment({
          id: `legacy-${log.id}`,
          name: log.product_name,
          amount: log.original_amount,
          currency: log.currency,
          category: log.category,
          paymentMethod: log.payment_method,
          frequency: log.recurrence_interval || "monthly",
          startDate: getLocalDateKey(log.timestamp),
          nextDueDate: calculateNextDueDate(
            getLocalDateKey(log.timestamp),
            log.recurrence_interval || "monthly"
          ),
          tags: log.tags,
          note: log.note,
          status: "active",
          reminderDaysBefore:
            settings.recurringPayments.defaultReminderDaysBefore,
          createdAt: log.timestamp,
          updatedAt: new Date().toISOString(),
        })
      );

    if (legacyTemplates.length > 0) {
      setRecurringPayments((current) => {
        const existingIds = new Set(current.map((payment) => payment.id));
        const nextTemplates = legacyTemplates.filter(
          (payment) => !existingIds.has(payment.id)
        );
        return nextTemplates.length > 0 ? [...current, ...nextTemplates] : current;
      });
    }

    localStorage.setItem(LEGACY_RECURRING_MIGRATION_KEY, "true");
  }, [normalizedHistory, settings.recurringPayments.defaultReminderDaysBefore]);

  const filteredHistory = useMemo(
    () => filterSpendLogs(normalizedHistory, filters),
    [normalizedHistory, filters]
  );

  const periodLogs = useMemo(
    () => getLogsForPeriod(normalizedHistory, filters.period),
    [normalizedHistory, filters.period]
  );

  const previousPeriodLogs = useMemo(
    () => getPreviousPeriodLogs(normalizedHistory, filters.period),
    [normalizedHistory, filters.period]
  );

  const insights = useMemo(
    () => calculateInsights(periodLogs, previousPeriodLogs),
    [periodLogs, previousPeriodLogs]
  );

  const monthLogs = useMemo(
    () => getLogsForPeriod(normalizedHistory, "month"),
    [normalizedHistory]
  );

  const budgetProgress = useMemo(
    () => calculateBudgetProgress(monthLogs, monthlyBudgetBase),
    [monthLogs, monthlyBudgetBase]
  );

  const recurringOverview = useMemo(
    () =>
      getUpcomingRecurringPayments(recurringPayments, {
        now: new Date(),
        showOverdueFirst: settings.recurringPayments.showOverdueFirst,
        defaults: {
          defaultReminderDaysBefore:
            settings.recurringPayments.defaultReminderDaysBefore,
        },
      }),
    [recurringPayments, settings.recurringPayments]
  );

  const monthlyProjection = useMemo(
    () =>
      getMonthlyProjectedSpending(monthLogs, recurringPayments, {
        now: new Date(),
      }),
    [monthLogs, recurringPayments]
  );

  const activeReminderCount = useMemo(
    () =>
      recurringOverview.all.filter(
        (payment) =>
          payment.status === "active" &&
          (payment.dueStatus === "overdue" ||
            payment.dueStatus === "today" ||
            payment.reminderActive)
      ).length,
    [recurringOverview]
  );

  const noSpendOptions = useMemo(
    () => ({
      ...settings.noSpendSettings,
      now: new Date(),
      locale: settings.locale,
    }),
    [settings.noSpendSettings, settings.locale]
  );

  const noSpendSummary = useMemo(
    () => calculateNoSpendSummary(normalizedHistory, noSpendOptions),
    [normalizedHistory, noSpendOptions]
  );

  const noSpendCalendar = useMemo(
    () => getNoSpendMonthCalendar(normalizedHistory, noSpendOptions),
    [normalizedHistory, noSpendOptions]
  );

  const availableTags = useMemo(() => {
    const tags = normalizedHistory.flatMap((log) => log.tags);
    return Array.from(new Set(tags)).sort((a, b) => a.localeCompare(b));
  }, [normalizedHistory]);

  const groupedHistory = useMemo(
    () =>
      filteredHistory.reduce((acc, log) => {
        const dateKey = formatDate(log.timestamp);
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(log);
        return acc;
      }, {}),
    [filteredHistory]
  );

  const selectedPeriodLabel =
    PERIOD_OPTIONS.find((period) => period.value === filters.period)?.label ||
    "Selected Period";

  async function fetchData() {
    try {
      const [localAgg, localLogs] = await Promise.all([
        invoke("get_spend_aggregates"),
        invoke("get_spend_logs"),
      ]);
      setAggregates(localAgg);
      setHistory(localLogs.map(normalizeSpendLog));
    } catch (err) {
      console.error("Local fetch failed", err);
    }
  }

  function setFormField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function setEditFormField(name, value) {
    setEditForm((current) => ({ ...current, [name]: value }));
  }

  function updateSetting(name, value) {
    setSettings((current) => {
      const next = { ...current, [name]: value };
      if (name === "backgroundEffects") {
        next.backgroundMotion = value;
      }
      if (name === "backgroundMotion") {
        next.backgroundEffects = value;
      }
      return next;
    });
    if (name === "defaultCurrency" && !form.amount && !form.productName.trim()) {
      setForm((currentForm) => ({ ...currentForm, currency: value }));
    }
  }

  function updateNoSpendSetting(name, value) {
    setSettings((current) => ({
      ...current,
      noSpendSettings: {
        ...current.noSpendSettings,
        [name]: value,
      },
    }));
  }

  function updateRecurringSetting(name, value) {
    setSettings((current) => ({
      ...current,
      recurringPayments: {
        ...current.recurringPayments,
        [name]: value,
      },
    }));
  }

  function setRecurringFormField(name, value) {
    setRecurringForm((current) => ({ ...current, [name]: value }));
  }

  function openAddRecurringPayment() {
    setEditingRecurringPaymentId(null);
    setRecurringForm(createEmptyRecurringForm(settings));
    setIsRecurringFormOpen(true);
  }

  function openEditRecurringPayment(payment) {
    const entry = normalizeRecurringPayment(payment);
    setEditingRecurringPaymentId(entry.id);
    setRecurringForm(createRecurringFormFromPayment(entry));
    setIsRecurringFormOpen(true);
  }

  function closeRecurringForm() {
    setIsRecurringFormOpen(false);
    setEditingRecurringPaymentId(null);
    setRecurringForm(createEmptyRecurringForm(settings));
  }

  function updateRecurringPayment(paymentId, updater) {
    setRecurringPayments((current) =>
      current.map((payment) => {
        if (payment.id !== paymentId) return payment;
        return normalizeRecurringPayment({
          ...payment,
          ...updater(normalizeRecurringPayment(payment)),
          updatedAt: new Date().toISOString(),
        });
      })
    );
  }

  function getAdvancedRecurringPayment(payment) {
    const entry = normalizeRecurringPayment(payment);
    return {
      ...entry,
      nextDueDate: calculateNextDueDate(entry.nextDueDate, entry.frequency, {
        interval: entry.interval,
      }),
    };
  }

  function handleRecurringFormSubmit(event) {
    event.preventDefault();

    const validation = validateRecurringDraft(recurringForm);
    if (validation.error) {
      alert(validation.error);
      return;
    }

    const existing = recurringPayments.find(
      (payment) => payment.id === editingRecurringPaymentId
    );
    const nextPayment = buildRecurringPaymentFromDraft(recurringForm, existing);

    setRecurringPayments((current) =>
      existing
        ? current.map((payment) =>
            payment.id === nextPayment.id ? nextPayment : payment
          )
        : [...current, nextPayment]
    );
    closeRecurringForm();
  }

  async function handleMarkRecurringPaid(payment) {
    const entry = normalizeRecurringPayment(payment);
    const payload = createTransactionFromRecurringPayment(entry, new Date());

    try {
      await invoke("add_spend_log", {
        ...payload,
        timestampOverride: payload.timestamp,
      });
      updateRecurringPayment(entry.id, () => getAdvancedRecurringPayment(entry));
      fetchData();
    } catch (err) {
      console.error("Failed to mark recurring payment as paid", err);
    }
  }

  function handleSkipRecurringPayment(payment) {
    const entry = normalizeRecurringPayment(payment);
    const confirmed = window.confirm(`Skip this ${entry.name} payment?`);
    if (!confirmed) return;

    updateRecurringPayment(entry.id, () => getAdvancedRecurringPayment(entry));
  }

  function handleToggleRecurringPause(payment) {
    const entry = normalizeRecurringPayment(payment);
    updateRecurringPayment(entry.id, () => ({
      status: entry.status === "paused" ? "active" : "paused",
    }));
  }

  function handleDeleteRecurringPayment(payment) {
    const entry = normalizeRecurringPayment(payment);
    const confirmed = window.confirm(`Delete recurring payment "${entry.name}"?`);
    if (!confirmed) return;

    setRecurringPayments((current) =>
      current.filter((item) => item.id !== entry.id)
    );
    if (editingRecurringPaymentId === entry.id) closeRecurringForm();
  }

  function handleEntryDateChange(date) {
    if (!date) return;
    setDateOverride(applyTime(date, timeInput));
  }

  function handleEntryTimeChange(e) {
    const nextTime = e.target.value;
    setTimeInput(nextTime);
    setDateOverride(applyTime(dateOverride || new Date(), nextTime));
  }

  function resetForm() {
    setForm(createEmptyForm(settings.defaultCurrency));
    setIsPastDate(false);
    setDateOverride(null);
    setTimeInput(getTimeValue(new Date()));
    amountRef.current?.focus();
  }

  async function handleSubmit(e) {
    if (e) e.preventDefault();

    const validation = validateExpenseDraft(form);
    if (validation.error) {
      alert(validation.error);
      return;
    }

    const timestamp =
      isPastDate && dateOverride ? dateOverride.toISOString() : new Date().toISOString();
    const payload = buildSpendPayloadFromDraft(form, timestamp);

    try {
      await invoke("add_spend_log", {
        ...payload,
        timestampOverride: isPastDate && dateOverride ? timestamp : null,
      });

      resetForm();
      fetchData();
    } catch (err) {
      console.error("Failed to save spend log", err);
    }
  }

  function handleEdit(log) {
    const entry = normalizeSpendLog(log);
    setEditingTransactionId(entry.id);
    setEditForm(createFormFromLog(entry));
  }

  function handleCancelEdit() {
    setEditingTransactionId(null);
    setEditForm(null);
  }

  async function refreshAggregates() {
    try {
      const localAgg = await invoke("get_spend_aggregates");
      setAggregates(localAgg);
    } catch (err) {
      console.error("Failed to refresh spending totals", err);
    }
  }

  async function handleSaveEdit(e, log) {
    if (e) e.preventDefault();
    if (!editForm) return;

    const validation = validateExpenseDraft(editForm);
    if (validation.error) {
      alert(validation.error);
      return;
    }

    const original = normalizeSpendLog(log);
    const timestamp = applyTime(editForm.date || new Date(original.timestamp), editForm.time)
      .toISOString();
    const payload = buildSpendPayloadFromDraft(editForm, timestamp);

    try {
      const updated = await invoke("update_spend_log", {
        id: original.id,
        ...payload,
        sourceRecurringPaymentId: original.source_recurring_payment_id || null,
        isRecurringGenerated: original.is_recurring_generated,
      });
      const normalizedUpdated = normalizeSpendLog(updated);

      setHistory((current) =>
        current.map((item) =>
          item.id === normalizedUpdated.id ? normalizedUpdated : item
        )
      );
      handleCancelEdit();
      refreshAggregates();
    } catch (err) {
      console.error("Failed to update spend log", err);
    }
  }

  async function addEntryFromLog(log, timestampOverride = null) {
    const entry = normalizeSpendLog(log);
    await invoke("add_spend_log", {
      amount: entry.amount,
      productName: entry.product_name,
      timestampOverride,
      currency: entry.currency,
      originalAmount: entry.original_amount,
      category: entry.category || "Other",
      tags: entry.tags,
      paymentMethod: entry.payment_method || "Cash",
      note: entry.note || null,
      isRecurring: entry.is_recurring,
      recurrenceInterval: entry.is_recurring
        ? entry.recurrence_interval || "monthly"
        : null,
      sourceRecurringPaymentId: entry.source_recurring_payment_id || null,
      isRecurringGenerated: entry.is_recurring_generated,
    });
  }

  async function handleDuplicate(log) {
    try {
      await addEntryFromLog(log);
      fetchData();
    } catch (err) {
      console.error("Failed to duplicate spend log", err);
    }
  }

  async function handleDelete(log) {
    const entry = normalizeSpendLog(log);
    const confirmed = window.confirm(`Delete "${entry.product_name}"?`);
    if (!confirmed) return;

    try {
      await invoke("delete_spend_log", { id: entry.id });
      setHistory((current) => current.filter((item) => item.id !== entry.id));
      setUndoEntry(entry);

      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      undoTimerRef.current = setTimeout(() => setUndoEntry(null), 10000);
      fetchData();
    } catch (err) {
      console.error("Failed to delete spend log", err);
    }
  }

  async function handleUndoDelete() {
    if (!undoEntry) return;

    try {
      await addEntryFromLog(undoEntry, undoEntry.timestamp);
      setUndoEntry(null);
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      fetchData();
    } catch (err) {
      console.error("Failed to restore spend log", err);
    }
  }

  function handleBudgetSave(e) {
    e.preventDefault();
    const trimmedBudget = budgetDraft.trim();

    if (!trimmedBudget) {
      localStorage.removeItem(MONTHLY_BUDGET_KEY);
      setMonthlyBudgetBase(0);
      return;
    }

    const parsedBudget = Number(trimmedBudget);
    if (Number.isNaN(parsedBudget) || parsedBudget < 0) {
      alert("Budget must be zero or a positive number.");
      return;
    }

    const budgetBase = toBaseAmount(parsedBudget, displayCurrency);
    localStorage.setItem(MONTHLY_BUDGET_KEY, String(budgetBase));
    setMonthlyBudgetBase(budgetBase);
  }

  function formatMoney(value) {
    return formatBaseCurrency(value, displayCurrency, settings.locale);
  }

  function formatTime(iso) {
    return getTimeValue(new Date(iso));
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString(settings.locale, {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatShortDate(date) {
    return new Date(date).toLocaleDateString(settings.locale, {
      month: "short",
      day: "numeric",
    });
  }

  function formatLocalDateKey(dateKey) {
    if (!dateKey) return "No spending yet";
    const [year, month, day] = dateKey.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString(settings.locale, {
      month: "short",
      day: "numeric",
    });
  }

  const budgetAlert =
    budgetProgress.threshold === 100
      ? "Budget reached. Review what can wait."
      : budgetProgress.threshold === 80
        ? "You have used 80% of this month's budget."
        : budgetProgress.threshold === 50
          ? "You are halfway through this month's budget."
          : null;

  return (
    <div
      className={`spending-container spending-container--${settings.transactionDensity} animate-slide-in`}
    >
      <div className="spend-top-actions">
        {settings.recurringPayments.showDashboardReminders &&
          activeReminderCount > 0 && (
            <span className="recurring-reminder-pill">
              {activeReminderCount} bill reminder
              {activeReminderCount === 1 ? "" : "s"}
            </span>
          )}
        <button
          type="button"
          className="secondary-action-btn"
          onClick={() => setIsSettingsOpen((current) => !current)}
          aria-expanded={isSettingsOpen}
        >
          Settings
        </button>
      </div>

      {isSettingsOpen && (
        <SettingsPanel
          settings={settings}
          onChange={updateSetting}
          onNoSpendChange={updateNoSpendSetting}
          onRecurringChange={updateRecurringSetting}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      <div className="summary-dashboard">
        <div className="summary-card">
          <div className="summary-label">Today</div>
          <div className="summary-amount">{formatMoney(aggregates.daily)}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">This Week</div>
          <div className="summary-amount">{formatMoney(aggregates.weekly)}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">This Month</div>
          <div className="summary-amount">{formatMoney(aggregates.monthly)}</div>
        </div>
      </div>

      <section className="spend-assistant-grid" aria-label="Spending insights">
        <div className="spend-panel spend-insight-panel">
          <SectionHeader
            kicker={selectedPeriodLabel}
            title="Spending Insights"
            helpKey="insights"
            showHelp={settings.showHelpButtons}
          />

          {insights.transactionCount === 0 ? (
            <p className="spend-muted">No expenses match this period yet.</p>
          ) : (
            <>
              <p className="spend-insight-copy">
                You spent the most on{" "}
                <strong>{insights.topCategory?.category || "Other"}</strong>{" "}
                {selectedPeriodLabel.toLowerCase()}.
              </p>
              <div className="spend-metric-grid">
                <div>
                  <span>Transactions</span>
                  <strong>{insights.transactionCount}</strong>
                </div>
                <div>
                  <span>Average</span>
                  <strong>{formatMoney(insights.average)}</strong>
                </div>
                <div>
                  <span>Highest</span>
                  <strong>{formatMoney(insights.highestExpense?.amount || 0)}</strong>
                </div>
                <div>
                  <span>Previous Period</span>
                  <strong>
                    {insights.comparisonPercent === null
                      ? "No baseline"
                      : `${insights.comparisonPercent > 0 ? "+" : ""}${Math.round(
                          insights.comparisonPercent
                        )}%`}
                  </strong>
                </div>
              </div>
              <div className="category-breakdown" aria-label="Spending by category">
                {insights.categorySummaries.map((item) => {
                  const percent = insights.total
                    ? Math.round((item.total / insights.total) * 100)
                    : 0;
                  return (
                    <div key={item.category} className="category-row">
                      <div className="category-row-top">
                        <span>{item.category}</span>
                        <span>
                          {formatMoney(item.total)} ({percent}%)
                        </span>
                      </div>
                      <div className="category-bar" aria-hidden="true">
                        <span style={{ width: `${Math.min(percent, 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="spend-panel budget-panel">
          <SectionHeader
            kicker="Monthly"
            title="Budget"
            helpKey="budget"
            showHelp={settings.showHelpButtons}
          />
          <form className="budget-form" onSubmit={handleBudgetSave}>
            <label className="spend-field">
              <span>Monthly Budget ({displayCurrency})</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={budgetDraft}
                onChange={(e) => setBudgetDraft(e.target.value)}
              />
            </label>
            <button type="submit" className="secondary-action-btn">
              Save
            </button>
          </form>
          <div className="budget-progress" aria-label="Monthly budget progress">
            <span
              style={{
                width: `${Math.min(Math.round(budgetProgress.percent), 100)}%`,
              }}
            />
          </div>
          <div className="budget-totals">
            <span>Spent {formatMoney(budgetProgress.spent)}</span>
            <span>
              {budgetProgress.budget > 0
                ? `${formatMoney(Math.max(budgetProgress.remaining, 0))} left`
                : "Set a monthly target"}
            </span>
          </div>
          {monthlyBudgetBase > 0 &&
            settings.recurringPayments.showDashboardReminders && (
              <div className="budget-projection" aria-label="Projected monthly spending">
                <div>
                  <span>Upcoming bills this month</span>
                  <strong>{formatMoney(monthlyProjection.upcomingPlanned)}</strong>
                </div>
                <div>
                  <span>Projected remaining</span>
                  <strong>
                    {formatMoney(
                      monthlyBudgetBase - monthlyProjection.projectedTotal
                    )}
                  </strong>
                </div>
              </div>
            )}
          {budgetAlert && (
            <div className={`budget-alert budget-alert--${budgetProgress.threshold}`}>
              {budgetAlert}
            </div>
          )}
        </div>

        <div className="spend-panel planned-panel bills-panel">
          <SectionHeader
            kicker="Upcoming"
            title="Bills & Subscriptions"
            helpKey="billsSubscriptions"
            showHelp={settings.showHelpButtons}
          />
          <div className="bills-panel-actions">
            <button
              type="button"
              className="secondary-action-btn"
              onClick={openAddRecurringPayment}
            >
              Add Recurring Payment
            </button>
          </div>

          {isRecurringFormOpen && (
            <RecurringPaymentForm
              draft={recurringForm}
              isEditing={Boolean(editingRecurringPaymentId)}
              showHelp={settings.showHelpButtons}
              onChange={setRecurringFormField}
              onSubmit={handleRecurringFormSubmit}
              onCancel={closeRecurringForm}
            />
          )}

          {recurringOverview.all.length === 0 ? (
            <p className="spend-muted">
              No recurring payments yet. Add rent, subscriptions, bills, or
              memberships to plan ahead.
            </p>
          ) : (
            <div className="recurring-payment-groups">
              {RECURRING_GROUP_ORDER.map((status) => {
                const group = recurringOverview.grouped[status] || [];
                if (group.length === 0) return null;

                return (
                  <div key={status} className="recurring-payment-group">
                    <div className="recurring-group-heading">
                      <span>{DUE_STATUS_LABELS[status]}</span>
                      <span>{group.length}</span>
                    </div>
                    <div className="recurring-payment-list">
                      {group.map((payment) => (
                        <RecurringPaymentItem
                          key={payment.id}
                          payment={payment}
                          showHelp={settings.showHelpButtons}
                          formatMoney={formatMoney}
                          formatDateKey={formatLocalDateKey}
                          onMarkPaid={handleMarkRecurringPaid}
                          onSkip={handleSkipRecurringPayment}
                          onEdit={openEditRecurringPayment}
                          onPause={handleToggleRecurringPause}
                          onDelete={handleDeleteRecurringPayment}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="spend-panel no-spend-panel">
          <SectionHeader
            kicker="Chain"
            title="No-Spend Tracker"
            helpKey="noSpend"
            showHelp={settings.showHelpButtons}
          />

          {!noSpendSummary.hasData ? (
            <p className="spend-muted">Log your first expense to begin tracking.</p>
          ) : (
            <>
              <div className="no-spend-hero">
                <span>Current streak</span>
                <strong>{noSpendSummary.current.streak}</strong>
                <span>
                  {noSpendSummary.current.streak === 1 ? "day" : "days"}
                </span>
              </div>
              <div className="no-spend-stats-grid">
                <div>
                  <span>Longest streak</span>
                  <strong>{noSpendSummary.longest.streak} days</strong>
                </div>
                <div>
                  <span>This month</span>
                  <strong>
                    {noSpendSummary.monthly.noSpendDays}
                    {noSpendSummary.monthly.completedDays
                      ? ` / ${noSpendSummary.monthly.completedDays}`
                      : ""}
                  </strong>
                </div>
                <div>
                  <span>Rate this month</span>
                  <strong>
                    {Math.round(noSpendSummary.monthly.rate * 100)}%
                  </strong>
                </div>
                <div>
                  <span>Last spending day</span>
                  <strong>{formatLocalDateKey(noSpendSummary.lastSpendingDate)}</strong>
                </div>
              </div>
              <p className="no-spend-today">
                {settings.noSpendSettings.countTodayInCurrentStreakPreview
                  ? noSpendSummary.today.label
                  : noSpendSummary.today.hasSpending
                    ? "Today: Spending recorded"
                    : "Today is not counted until it is complete."}
              </p>
              <p className="spend-muted">
                {noSpendSummary.today.hasSpending
                  ? "Spending recorded today. Start a new chain tomorrow."
                  : "You are building a no-spend chain."}
              </p>
            </>
          )}
        </div>
      </section>

      <section className="spend-panel no-spend-calendar-panel" aria-label="No-spend calendar">
        <div className="spend-section-header">
          <span className="spend-section-kicker">{noSpendCalendar.monthLabel}</span>
          <div className="spend-title-with-help">
            <h2>No-Spend Month View</h2>
            {settings.showHelpButtons && (
              <HelpButton
                title={HELP_TEXT.noSpend.title}
                body={HELP_TEXT.noSpend.body}
                ariaLabel="Explain No-Spend Month View"
              />
            )}
          </div>
        </div>

        {!noSpendSummary.hasData ? (
          <p className="spend-muted">Start logging expenses to see no-spend days.</p>
        ) : (
          <div className="no-spend-calendar-grid">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <span key={day} className="no-spend-weekday">
                {day}
              </span>
            ))}
            {noSpendCalendar.days.map((day) => {
              if (day.isEmpty) {
                return <span key={day.key} className="no-spend-day is-empty" />;
              }

              const statusLabel = day.isFuture
                ? "Future"
                : day.hasSpending
                  ? `Spent ${formatMoney(day.spendingTotal)}`
                  : day.isToday
                    ? "No spend so far"
                  : day.noSpend
                    ? "No spend"
                    : "No data";

              return (
                <div
                  key={day.key}
                  className={[
                    "no-spend-day",
                    day.isToday ? "is-today" : "",
                    day.isFuture ? "is-future" : "",
                    day.noSpend ? "is-no-spend" : "",
                    day.hasSpending ? "has-spending" : "",
                    !day.hasData ? "is-untracked" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  title={`${day.key}: ${statusLabel}`}
                  aria-label={`${day.key}: ${statusLabel}`}
                >
                  <strong>{day.day}</strong>
                  <span>{statusLabel}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="spend-controls-row">
        <div className="entry-date-control">
          <span className="spend-label">Expense Date</span>
          <div className="date-toggle-group" role="group" aria-label="Expense date">
            <button
              type="button"
              className={`date-toggle-btn ${!isPastDate ? "active" : ""}`}
              onClick={() => {
                setIsPastDate(false);
                setDateOverride(null);
              }}
            >
              Today
            </button>
            <button
              type="button"
              className={`date-toggle-btn ${isPastDate ? "active" : ""}`}
              onClick={() => {
                const now = new Date();
                setIsPastDate(true);
                setDateOverride(dateOverride || now);
                setTimeInput(getTimeValue(dateOverride || now));
              }}
            >
              Other Date
            </button>
          </div>
        </div>

        {isPastDate && (
          <>
            <label className="spend-field spend-field--compact">
              <span>Date</span>
              <DatePicker
                selected={dateOverride}
                onChange={handleEntryDateChange}
                dateFormat="MM/dd/yyyy"
                className="spend-datepicker-input"
              />
            </label>
            <label className="spend-field spend-field--compact">
              <span>Time</span>
              <input
                type="time"
                value={timeInput}
                onChange={handleEntryTimeChange}
              />
            </label>
          </>
        )}
      </div>

      <form
        className="spend-input-form"
        onSubmit={handleSubmit}
      >
        <SectionHeader
          title="Add Expense"
          helpKey="addExpense"
          showHelp={settings.showHelpButtons}
        />
        <div className="spend-form-grid">
          <label className="spend-field spend-field--amount">
            <span>Amount</span>
            <input
              ref={amountRef}
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(e) => setFormField("amount", e.target.value)}
              required
            />
          </label>

          <label className="spend-field">
            <span>Currency</span>
            <select
              value={form.currency}
              onChange={(e) => setFormField("currency", e.target.value)}
            >
              {CURRENCY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="spend-field spend-field--description">
            <span>Description</span>
            <input
              type="text"
              value={form.productName}
              onChange={(e) => setFormField("productName", e.target.value)}
              placeholder="Merchant or item"
              required
            />
          </label>

          <div className="spend-field">
            <FieldHelpLabel
              htmlFor="spend-category"
              label="Category"
              helpKey="category"
              showHelp={settings.showHelpButtons}
            />
            <select
              id="spend-category"
              value={form.category}
              onChange={(e) => setFormField("category", e.target.value || "Other")}
              required
            >
              {DEFAULT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="spend-field">
            <FieldHelpLabel
              htmlFor="spend-payment-method"
              label="Payment Method"
              helpKey="paymentMethod"
              showHelp={settings.showHelpButtons}
            />
            <select
              id="spend-payment-method"
              value={form.paymentMethod}
              onChange={(e) => setFormField("paymentMethod", e.target.value)}
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </div>

          <div className="spend-field spend-field--tags">
            <FieldHelpLabel
              htmlFor="spend-tags"
              label="Tags"
              helpKey="tags"
              showHelp={settings.showHelpButtons}
            />
            <input
              id="spend-tags"
              type="text"
              value={form.tags}
              onChange={(e) => setFormField("tags", e.target.value)}
              placeholder="work, weekend, subscription"
            />
          </div>

          <label className="spend-field spend-field--note">
            <span>Note</span>
            <input
              type="text"
              value={form.note}
              onChange={(e) => setFormField("note", e.target.value)}
              placeholder="Optional context"
            />
          </label>
        </div>

        <div className="spend-form-footer">
          <div className="recurring-control">
            <label className="recurring-toggle">
              <input
                type="checkbox"
                checked={form.isRecurring}
                onChange={(e) => setFormField("isRecurring", e.target.checked)}
              />
              <span>Recurring payment</span>
            </label>
            {settings.showHelpButtons && (
              <HelpButton
                title={HELP_TEXT.recurring.title}
                body={HELP_TEXT.recurring.body}
                ariaLabel="Explain Recurring Payment"
              />
            )}
          </div>

          {form.isRecurring && (
            <label className="spend-field spend-field--compact">
              <span>Repeats</span>
              <select
                value={form.recurrenceInterval}
                onChange={(e) =>
                  setFormField("recurrenceInterval", e.target.value)
                }
              >
                {RECURRENCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="spend-form-actions">
            {normalizedHistory.length > 0 && (
              <button
                type="button"
                className="secondary-action-btn"
                onClick={() => handleDuplicate(normalizedHistory[0])}
              >
                Duplicate Last
              </button>
            )}
            <button type="submit" className="spend-submit-btn">
              Add Expense
            </button>
          </div>
        </div>
      </form>

      <section className="spend-filter-panel" aria-label="Transaction filters">
        <div className="spend-filter-header">
          <SectionHeader
            title="Filters / Search"
            helpKey="filters"
            showHelp={settings.showHelpButtons}
          />
        </div>
        <label className="spend-field spend-search-field">
          <span>Search</span>
          <input
            type="search"
            value={filters.query}
            onChange={(e) =>
              setFilters((current) => ({ ...current, query: e.target.value }))
            }
            placeholder="Description, category, tag, or payment method"
          />
        </label>

        <label className="spend-field">
          <span>Period</span>
          <select
            value={filters.period}
            onChange={(e) =>
              setFilters((current) => ({ ...current, period: e.target.value }))
            }
          >
            {PERIOD_OPTIONS.map((period) => (
              <option key={period.value} value={period.value}>
                {period.label}
              </option>
            ))}
          </select>
        </label>

        <label className="spend-field">
          <span>Category</span>
          <select
            value={filters.category}
            onChange={(e) =>
              setFilters((current) => ({
                ...current,
                category: e.target.value,
              }))
            }
          >
            <option value="All">All Categories</option>
            {DEFAULT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <label className="spend-field">
          <span>Tag</span>
          <select
            value={filters.tag}
            onChange={(e) =>
              setFilters((current) => ({ ...current, tag: e.target.value }))
            }
          >
            <option value="All">All Tags</option>
            {availableTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </label>

        <label className="spend-field">
          <span>Payment</span>
          <select
            value={filters.paymentMethod}
            onChange={(e) =>
              setFilters((current) => ({
                ...current,
                paymentMethod: e.target.value,
              }))
            }
          >
            <option value="All">All Methods</option>
            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </label>
      </section>

      {undoEntry && (
        <div className="undo-banner" role="status">
          <span>Deleted "{undoEntry.product_name}".</span>
          <button type="button" onClick={handleUndoDelete}>
            Undo
          </button>
        </div>
      )}

      <section className="spend-transactions-section" aria-label="Transactions">
        <div className="spend-history-heading">
          <div className="spend-title-with-help">
            <h2>Transactions</h2>
            {settings.showHelpButtons && (
              <HelpButton
                title={HELP_TEXT.transactions.title}
                body={HELP_TEXT.transactions.body}
                ariaLabel="Explain Transactions"
              />
            )}
          </div>
          <span>
            {filteredHistory.length} of {normalizedHistory.length} shown
          </span>
        </div>

        <div className="spend-history-container">
          {filteredHistory.length === 0 ? (
            <div className="empty-state">No spending entries match these filters.</div>
          ) : (
            Object.entries(groupedHistory).map(([date, dayLogs]) => {
              const dayTotal = dayLogs.reduce((sum, log) => sum + log.amount, 0);
              return (
                <div key={date} className="spend-day-panel animate-slide-in">
                  <div className="spend-date-header">
                    <span>{date}</span>
                    <span className="spend-day-total">
                      Total: {formatMoney(dayTotal)}
                    </span>
                  </div>
                  <div className="spend-day-items">
                    {dayLogs.map((log) =>
                      editingTransactionId === log.id && editForm ? (
                        <InlineTransactionEditor
                          key={log.id}
                          log={log}
                          draft={editForm}
                          showHelp={settings.showHelpButtons}
                          onChange={setEditFormField}
                          onSave={handleSaveEdit}
                          onCancel={handleCancelEdit}
                        />
                      ) : (
                        <article key={log.id} className="spend-item">
                          <div className="spend-item-time">{formatTime(log.timestamp)}</div>
                          <div className="spend-item-main">
                            <div className="spend-item-title-row">
                              <span className="spend-item-name">{log.product_name}</span>
                              <span className="category-chip">{log.category}</span>
                              {log.is_recurring && (
                                <span className="recurring-chip">
                                  {log.recurrence_interval || "monthly"}
                                </span>
                              )}
                              {(log.is_recurring_generated ||
                                log.source_recurring_payment_id) && (
                                <span className="recurring-chip">
                                  From subscription
                                </span>
                              )}
                            </div>
                            <div className="spend-item-meta">
                              <span>{log.payment_method}</span>
                              {log.note && <span>{log.note}</span>}
                            </div>
                            {log.tags.length > 0 && (
                              <div className="tag-list" aria-label="Tags">
                                {log.tags.map((tag) => (
                                  <span key={tag} className="tag-chip">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="spend-item-side">
                            <div className="spend-item-amount">{formatMoney(log.amount)}</div>
                            <div className="spend-item-actions">
                              <button type="button" onClick={() => handleEdit(log)}>
                                Edit
                              </button>
                              <button type="button" onClick={() => handleDuplicate(log)}>
                                Duplicate
                              </button>
                              <button type="button" onClick={() => handleDelete(log)}>
                                Delete
                              </button>
                            </div>
                          </div>
                        </article>
                      )
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
