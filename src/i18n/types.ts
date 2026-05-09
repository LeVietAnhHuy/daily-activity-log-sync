// Translation types for the Daily Log app

export const SUPPORTED_LANGUAGES = ["en", "vi", "ko"] as const;
export type LanguageCode = typeof SUPPORTED_LANGUAGES[number];

export interface Translation {
  // Navigation
  "nav.log": string;
  "nav.calendar": string;
  "nav.spending": string;
  "nav.settings": string;

  // Summary cards
  "summary.today": string;
  "summary.thisWeek": string;
  "summary.thisMonth": string;

  // Settings sections
  "settings.title": string;
  "settings.appearance": string;
  "settings.language": string;
  "settings.currency": string;

  // Appearance settings
  "settings.theme": string;
  "settings.backgroundEffects": string;
  "settings.themeIntensity": string;
  "settings.performanceMode": string;
  "settings.autoReduceMotion": string;
  "settings.compactTransactionView": string;
  "settings.transactionDensity.comfortable": string;
  "settings.transactionDensity.compact": string;

  // Language settings
  "settings.appLanguage": string;
  "settings.formatLocaleMode": string;
  "settings.formatMode.language": string;
  "settings.formatMode.currency": string;
  "settings.autoMatchLanguageToCurrency": string;

  // Currency settings
  "settings.defaultCurrency": string;
  "settings.displayCurrency": string;

  // Help settings
  "settings.showHelpButtons": string;

  // No-Spend settings
  "settings.noSpendPreviewToday": string;
  "settings.noSpendExcludeIncome": string;
  "settings.noSpendStartFromFirst": string;

  // Recurring payments settings
  "settings.defaultReminderDays": string;
  "settings.showOverdueFirst": string;
  "settings.showDashboardReminders": string;

  // Spending page
  "spending.title": string;
  "spending.addExpense": string;
  "spending.transactions": string;
  "spending.filters": string;
  "spending.search": string;
  "spending.category": string;
  "spending.tags": string;
  "spending.paymentMethod": string;
  "spending.amount": string;
  "spending.description": string;
  "spending.note": string;
  "spending.save": string;
  "spending.cancel": string;
  "spending.edit": string;
  "spending.duplicate": string;
  "spending.delete": string;
  "spending.recurringPayment": string;
  "spending.repeats": string;
  "spending.date": string;
  "spending.time": string;
  "spending.currency": string;

  // Budget
  "spending.budget": string;
  "spending.monthlyBudget": string;
  "spending.budgetUsedPercent": string;
  "spending.budgetRemaining": string;

  // Bills & Subscriptions
  "spending.billsSubscriptions": string;
  "spending.addRecurringPayment": string;
  "spending.noRecurringPayments": string;
  "spending.name": string;
  "spending.frequency": string;
  "spending.startDate": string;
  "spending.nextDueDate": string;
  "spending.reminderDaysBefore": string;
  "spending.status": string;

  // No-Spend Tracker
  "noSpend.title": string;
  "noSpend.currentStreak": string;
  "noSpend.longestStreak": string;
  "noSpend.thisMonth": string;
  "noSpend.today": string;
  "noSpend.noSpendingToday": string;
  "noSpend.spendingToday": string;
  "noSpend.monthView": string;

  // Smart Review
  "smartReview.title": string;
  "smartReview.insights": string;
  "smartReview.suggestions": string;
  "smartReview.addMoreExpenses": string;

  // Common actions
  "actions.close": string;
  "actions.clear": string;
  "actions.apply": string;
  "actions.reset": string;

  // Frequency labels
  "frequency.weekly": string;
  "frequency.monthly": string;
  "frequency.yearly": string;
  "frequency.custom": string;

  // Status labels
  "status.overdue": string;
  "status.today": string;
  "status.soon": string;
  "status.later": string;
  "status.paused": string;
  "status.ended": string;
  "status.active": string;

  // Empty states
  "empty.noLogs": string;
  "empty.noTransactions": string;
  "empty.noResults": string;

  // Validation messages
  "validation.required": string;
  "validation.positiveAmount": string;
}

export type TranslationKey = keyof Translation;
