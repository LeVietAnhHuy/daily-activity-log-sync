export const BASE_CURRENCY = "VND";
export const CURRENCY_LOCALE = "en-US";
export const METADATA_CURRENCY_CODES = ["VND", "KRW", "USD", "EUR", "JPY", "CNY", "GBP"];

export const exchangeRates = {
  VND: 1,
  USD: 25400,
  EUR: 27200,
  JPY: 162,
  KRW: 18.5,
};

export const DEFAULT_CATEGORIES = [
  "Food",
  "Transport",
  "Shopping",
  "Bills",
  "Entertainment",
  "Health",
  "Education",
  "Income",
  "Other",
];

export const PAYMENT_METHODS = [
  "Cash",
  "Card",
  "Bank Transfer",
  "Mobile Pay",
  "Other",
];

export const RECURRENCE_OPTIONS = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

export const RECURRING_PAYMENT_STATUS_OPTIONS = ["active", "paused", "ended"];

export const PERIOD_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "all", label: "All Time" },
];

const DEFAULT_NO_SPEND_OPTIONS = {
  excludeIncomeFromSpending: true,
  startTrackingFromFirstTransaction: true,
};

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function cleanCurrencyFromText(value, fallback = "") {
  const text = String(value || "").trim();
  if (!text) return fallback;

  const codePattern = METADATA_CURRENCY_CODES.map(escapeRegExp).join("|");
  const cleaned = text
    .replace(new RegExp(`(^|[\\s,·|/()-]+)(${codePattern})(?=$|[\\s,·|/()-]+)`, "gi"), " ")
    .replace(/[·|/,-]+\s*$/g, "")
    .replace(/^\s*[·|/,-]+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  return cleaned || fallback;
}

export function parseTags(value) {
  const rawTags = Array.isArray(value)
    ? value
    : String(value || "")
        .split(",")
        .map((tag) => tag.trim());

  return Array.from(
    new Set(
      rawTags
        .map((tag) => cleanCurrencyFromText(tag))
        .filter(Boolean)
        .map((tag) => tag.toLowerCase())
    )
  );
}

export function normalizeSpendLog(log) {
  const amount = Number(log?.amount || 0);
  const currency = log?.currency || BASE_CURRENCY;
  const originalAmount =
    Number(log?.original_amount ?? log?.originalAmount) ||
    amount / (exchangeRates[currency] || 1);

  return {
    ...log,
    amount,
    product_name: log?.product_name || log?.productName || "",
    timestamp: log?.timestamp || new Date().toISOString(),
    currency,
    original_amount: originalAmount,
    category: cleanCurrencyFromText(log?.category, "Other"),
    tags: parseTags(log?.tags),
    payment_method: cleanCurrencyFromText(
      log?.payment_method || log?.paymentMethod,
      "Cash"
    ),
    note: log?.note || "",
    is_recurring: Boolean(log?.is_recurring ?? log?.isRecurring),
    recurrence_interval:
      log?.recurrence_interval || log?.recurrenceInterval || null,
    source_recurring_payment_id:
      log?.source_recurring_payment_id || log?.sourceRecurringPaymentId || null,
    is_recurring_generated: Boolean(
      log?.is_recurring_generated ?? log?.isRecurringGenerated
    ),
  };
}

export function toBaseAmount(amount, currency) {
  return Number(amount || 0) * (exchangeRates[currency] || 1);
}

export function fromBaseAmount(amount, currency) {
  return Number(amount || 0) / (exchangeRates[currency] || 1);
}

export function formatCurrency(amountInBase, currency, locale = CURRENCY_LOCALE) {
  const converted = fromBaseAmount(amountInBase, currency);
  const noMinorUnits = ["VND", "JPY", "KRW"].includes(currency);

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: noMinorUnits ? 0 : 2,
    }).format(converted);
  } catch {
    return `${converted.toFixed(noMinorUnits ? 0 : 2)} ${currency}`;
  }
}

function startOfDay(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function parseLocalDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function getDateKeyRange(startKey, endKey) {
  if (!startKey || !endKey || startKey > endKey) return [];

  const keys = [];
  let cursor = parseLocalDateKey(startKey);
  const end = parseLocalDateKey(endKey);

  while (cursor <= end) {
    keys.push(getLocalDateKey(cursor));
    cursor = addDays(cursor, 1);
  }

  return keys;
}

function addMonths(date, months) {
  const next = new Date(date);
  const originalDay = next.getDate();
  next.setDate(1);
  next.setMonth(next.getMonth() + months);
  const lastDayOfTargetMonth = new Date(
    next.getFullYear(),
    next.getMonth() + 1,
    0
  ).getDate();
  next.setDate(Math.min(originalDay, lastDayOfTargetMonth));
  return next;
}

function addYears(date, years) {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + years);
  return next;
}

function startOfWeek(date) {
  const start = startOfDay(date);
  const day = start.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return addDays(start, mondayOffset);
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function getLocalDateKey(date) {
  const value = new Date(date);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isSpendingTransaction(transaction, options = {}) {
  const opts = { ...DEFAULT_NO_SPEND_OPTIONS, ...options };
  const log = normalizeSpendLog(transaction);
  if (log.amount <= 0) return false;
  if (opts.excludeIncomeFromSpending && log.category.toLowerCase() === "income") {
    return false;
  }
  return true;
}

export function getTransactionsByDate(transactions) {
  return transactions.map(normalizeSpendLog).reduce((acc, transaction) => {
    const key = getLocalDateKey(transaction.timestamp);
    if (!acc[key]) acc[key] = [];
    acc[key].push(transaction);
    return acc;
  }, {});
}

export function isNoSpendDay(dateKey, transactionsByDate, options = {}) {
  const dayTransactions = transactionsByDate[dateKey] || [];
  return !dayTransactions.some((transaction) =>
    isSpendingTransaction(transaction, options)
  );
}

function getFirstTrackedDateKey(transactions) {
  const keys = transactions
    .map(normalizeSpendLog)
    .map((transaction) => getLocalDateKey(transaction.timestamp))
    .sort();
  return keys[0] || null;
}

function getLastCompletedDateKey(now = new Date()) {
  return getLocalDateKey(addDays(startOfDay(now), -1));
}

export function getLastSpendingDate(transactions, options = {}) {
  const spendingKeys = transactions
    .map(normalizeSpendLog)
    .filter((transaction) => isSpendingTransaction(transaction, options))
    .map((transaction) => getLocalDateKey(transaction.timestamp))
    .sort();
  return spendingKeys[spendingKeys.length - 1] || null;
}

export function calculateCurrentNoSpendStreak(transactions, options = {}) {
  const opts = { ...DEFAULT_NO_SPEND_OPTIONS, ...options };
  const logs = transactions.map(normalizeSpendLog);
  const firstTrackedDate = getFirstTrackedDateKey(logs);

  if (!firstTrackedDate) {
    return { hasData: false, streak: 0, startDate: null, endDate: null };
  }

  const transactionsByDate = getTransactionsByDate(logs);
  const endDate = getLastCompletedDateKey(opts.now || new Date());
  const startBoundary = opts.startTrackingFromFirstTransaction
    ? firstTrackedDate
    : null;

  if (startBoundary && endDate < startBoundary) {
    return { hasData: true, streak: 0, startDate: null, endDate };
  }

  let streak = 0;
  let cursor = parseLocalDateKey(endDate);
  let streakStart = null;

  while (!startBoundary || getLocalDateKey(cursor) >= startBoundary) {
    const key = getLocalDateKey(cursor);
    if (!isNoSpendDay(key, transactionsByDate, opts)) break;
    streak += 1;
    streakStart = key;
    cursor = addDays(cursor, -1);
  }

  return {
    hasData: true,
    streak,
    startDate: streakStart,
    endDate,
  };
}

export function calculateLongestNoSpendStreak(transactions, options = {}) {
  const opts = { ...DEFAULT_NO_SPEND_OPTIONS, ...options };
  const logs = transactions.map(normalizeSpendLog);
  const firstTrackedDate = getFirstTrackedDateKey(logs);

  if (!firstTrackedDate) {
    return { hasData: false, streak: 0, startDate: null, endDate: null };
  }

  const endDate = getLastCompletedDateKey(opts.now || new Date());
  const startDate = opts.startTrackingFromFirstTransaction
    ? firstTrackedDate
    : getLocalDateKey(startOfMonth(parseLocalDateKey(firstTrackedDate)));
  const transactionsByDate = getTransactionsByDate(logs);

  let current = 0;
  let currentStart = null;
  let longest = 0;
  let longestStart = null;
  let longestEnd = null;

  for (const key of getDateKeyRange(startDate, endDate)) {
    if (isNoSpendDay(key, transactionsByDate, opts)) {
      currentStart = currentStart || key;
      current += 1;
      if (current > longest) {
        longest = current;
        longestStart = currentStart;
        longestEnd = key;
      }
    } else {
      current = 0;
      currentStart = null;
    }
  }

  return {
    hasData: true,
    streak: longest,
    startDate: longestStart,
    endDate: longestEnd,
  };
}

export function calculateMonthlyNoSpendStats(transactions, options = {}) {
  const opts = { ...DEFAULT_NO_SPEND_OPTIONS, ...options };
  const now = opts.now || new Date();
  const logs = transactions.map(normalizeSpendLog);
  const firstTrackedDate = getFirstTrackedDateKey(logs);

  if (!firstTrackedDate) {
    return {
      hasData: false,
      noSpendDays: 0,
      completedDays: 0,
      rate: 0,
      monthStart: getLocalDateKey(startOfMonth(now)),
      monthEnd: getLastCompletedDateKey(now),
    };
  }

  const monthStart = getLocalDateKey(startOfMonth(now));
  const endDate = getLastCompletedDateKey(now);
  const startDate =
    opts.startTrackingFromFirstTransaction && firstTrackedDate > monthStart
      ? firstTrackedDate
      : monthStart;
  const transactionsByDate = getTransactionsByDate(logs);
  const dateKeys = getDateKeyRange(startDate, endDate);
  const noSpendDays = dateKeys.filter((key) =>
    isNoSpendDay(key, transactionsByDate, opts)
  ).length;
  const completedDays = dateKeys.length;

  return {
    hasData: true,
    noSpendDays,
    completedDays,
    rate: completedDays ? noSpendDays / completedDays : 0,
    monthStart: startDate,
    monthEnd: endDate,
  };
}

export function getNoSpendTodayStatus(transactions, options = {}) {
  const opts = { ...DEFAULT_NO_SPEND_OPTIONS, ...options };
  const todayKey = getLocalDateKey(opts.now || new Date());
  const transactionsByDate = getTransactionsByDate(transactions);
  const hasSpending = (transactionsByDate[todayKey] || []).some((transaction) =>
    isSpendingTransaction(transaction, opts)
  );

  return {
    dateKey: todayKey,
    hasSpending,
    label: hasSpending
      ? "Today: Spending recorded"
      : "Today so far: No spending recorded",
  };
}

export function calculateNoSpendSummary(transactions, options = {}) {
  const opts = { ...DEFAULT_NO_SPEND_OPTIONS, ...options };
  const logs = transactions.map(normalizeSpendLog);

  return {
    hasData: logs.length > 0,
    current: calculateCurrentNoSpendStreak(logs, opts),
    longest: calculateLongestNoSpendStreak(logs, opts),
    monthly: calculateMonthlyNoSpendStats(logs, opts),
    today: getNoSpendTodayStatus(logs, opts),
    lastSpendingDate: getLastSpendingDate(logs, opts),
  };
}

export function getNoSpendMonthCalendar(transactions, options = {}) {
  const opts = { ...DEFAULT_NO_SPEND_OPTIONS, ...options };
  const now = opts.now || new Date();
  const monthDate = opts.monthDate || now;
  const monthStart = startOfMonth(monthDate);
  const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const todayKey = getLocalDateKey(now);
  const firstTrackedDate = getFirstTrackedDateKey(transactions);
  const transactionsByDate = getTransactionsByDate(transactions);
  const firstWeekday = monthStart.getDay();
  const days = [];

  for (let i = 0; i < firstWeekday; i += 1) {
    days.push({ key: `empty-${i}`, isEmpty: true });
  }

  for (const key of getDateKeyRange(getLocalDateKey(monthStart), getLocalDateKey(monthEnd))) {
    const date = parseLocalDateKey(key);
    const dayTransactions = transactionsByDate[key] || [];
    const spendingTransactions = dayTransactions.filter((transaction) =>
      isSpendingTransaction(transaction, opts)
    );
    const spendingTotal = spendingTransactions.reduce(
      (sum, transaction) => sum + normalizeSpendLog(transaction).amount,
      0
    );
    const isFuture = key > todayKey;
    const isToday = key === todayKey;
    const beforeTracking =
      opts.startTrackingFromFirstTransaction && firstTrackedDate && key < firstTrackedDate;
    const hasData = Boolean(firstTrackedDate) && !beforeTracking;
    const noSpend = hasData && !isFuture && spendingTransactions.length === 0;

    days.push({
      key,
      day: date.getDate(),
      isEmpty: false,
      isFuture,
      isToday,
      hasData,
      noSpend,
      hasSpending: spendingTransactions.length > 0,
      spendingTotal,
    });
  }

  return {
    monthLabel: monthDate.toLocaleDateString(opts.locale || CURRENCY_LOCALE, {
      month: "long",
      year: "numeric",
    }),
    days,
  };
}

export function getPeriodBounds(period, now = new Date()) {
  const end = new Date(now);

  if (period === "today") {
    const start = startOfDay(now);
    return {
      start,
      end,
      previousStart: addDays(start, -1),
      previousEnd: start,
      label: "today",
      previousLabel: "yesterday",
    };
  }

  if (period === "week") {
    const start = startOfWeek(now);
    return {
      start,
      end,
      previousStart: addDays(start, -7),
      previousEnd: start,
      label: "this week",
      previousLabel: "last week",
    };
  }

  if (period === "month") {
    const start = startOfMonth(now);
    return {
      start,
      end,
      previousStart: addMonths(start, -1),
      previousEnd: start,
      label: "this month",
      previousLabel: "last month",
    };
  }

  return {
    start: null,
    end: null,
    previousStart: null,
    previousEnd: null,
    label: "all time",
    previousLabel: null,
  };
}

export function isWithinRange(timestamp, start, end) {
  const value = new Date(timestamp);
  if (Number.isNaN(value.getTime())) return false;
  if (start && value < start) return false;
  if (end && value > end) return false;
  return true;
}

export function getLogsForPeriod(logs, period, now = new Date()) {
  const bounds = getPeriodBounds(period, now);
  return logs
    .map(normalizeSpendLog)
    .filter((log) => isWithinRange(log.timestamp, bounds.start, bounds.end));
}

export function getPreviousPeriodLogs(logs, period, now = new Date()) {
  const bounds = getPeriodBounds(period, now);
  if (!bounds.previousStart || !bounds.previousEnd) return [];

  return logs
    .map(normalizeSpendLog)
    .filter((log) =>
      isWithinRange(log.timestamp, bounds.previousStart, bounds.previousEnd)
    );
}

export function filterSpendLogs(logs, filters, now = new Date()) {
  const query = filters.query.trim().toLowerCase();
  const periodLogs = getLogsForPeriod(logs, filters.period, now);

  return periodLogs
    .filter((log) => {
      if (filters.category !== "All" && log.category !== filters.category) {
        return false;
      }
      if (filters.tag !== "All" && !log.tags.includes(filters.tag)) {
        return false;
      }
      if (
        filters.paymentMethod !== "All" &&
        log.payment_method !== filters.paymentMethod
      ) {
        return false;
      }
      if (!query) return true;

      const searchable = [
        log.product_name,
        log.category,
        log.payment_method,
        log.note,
        ...log.tags,
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    })
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

export function summarizeByCategory(logs) {
  const summary = logs.reduce((acc, rawLog) => {
    const log = normalizeSpendLog(rawLog);
    const key = log.category || "Other";
    if (!acc[key]) {
      acc[key] = { category: key, total: 0, count: 0 };
    }
    acc[key].total += log.amount;
    acc[key].count += 1;
    return acc;
  }, {});

  return Object.values(summary).sort((a, b) => b.total - a.total);
}

export function calculateInsights(periodLogs, previousPeriodLogs = []) {
  const logs = periodLogs.map(normalizeSpendLog);
  const total = logs.reduce((sum, log) => sum + log.amount, 0);
  const previousTotal = previousPeriodLogs
    .map(normalizeSpendLog)
    .reduce((sum, log) => sum + log.amount, 0);
  const transactionCount = logs.length;
  const categorySummaries = summarizeByCategory(logs);
  const highestExpense = logs.reduce(
    (highest, log) => (!highest || log.amount > highest.amount ? log : highest),
    null
  );

  return {
    total,
    previousTotal,
    transactionCount,
    average: transactionCount ? total / transactionCount : 0,
    topCategory: categorySummaries[0] || null,
    categorySummaries,
    highestExpense,
    comparisonPercent:
      previousTotal > 0 ? ((total - previousTotal) / previousTotal) * 100 : null,
  };
}

export function calculateBudgetProgress(monthLogs, monthlyBudgetBase) {
  const budget = Number(monthlyBudgetBase || 0);
  const spent = monthLogs
    .map(normalizeSpendLog)
    .reduce((sum, log) => sum + log.amount, 0);
  const percent = budget > 0 ? Math.min((spent / budget) * 100, 999) : 0;
  const remaining = budget - spent;

  let threshold = null;
  if (budget > 0 && percent >= 100) threshold = 100;
  else if (budget > 0 && percent >= 80) threshold = 80;
  else if (budget > 0 && percent >= 50) threshold = 50;

  return {
    budget,
    spent,
    remaining,
    percent,
    threshold,
  };
}

export function getNextOccurrence(timestamp, interval, now = new Date()) {
  let next = new Date(timestamp);
  if (Number.isNaN(next.getTime())) return null;

  while (next <= now) {
    if (interval === "weekly") next = addDays(next, 7);
    else if (interval === "yearly") next = addYears(next, 1);
    else next = addMonths(next, 1);
  }

  return next;
}

export function getUpcomingRecurring(logs, now = new Date()) {
  return logs
    .map(normalizeSpendLog)
    .filter((log) => log.is_recurring)
    .map((log) => ({
      ...log,
      nextDate: getNextOccurrence(
        log.timestamp,
        log.recurrence_interval || "monthly",
        now
      ),
    }))
    .filter((log) => log.nextDate)
    .sort((a, b) => a.nextDate - b.nextDate);
}

function normalizeDateKey(value, fallbackDate = new Date()) {
  if (!value) return getLocalDateKey(fallbackDate);
  if (value instanceof Date) return getLocalDateKey(value);

  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return getLocalDateKey(fallbackDate);

  return getLocalDateKey(parsed);
}

function normalizeFrequency(value) {
  return ["weekly", "monthly", "yearly", "custom"].includes(value)
    ? value
    : "monthly";
}

function normalizeRecurringStatus(value) {
  return RECURRING_PAYMENT_STATUS_OPTIONS.includes(value) ? value : "active";
}

function advanceRecurringDate(date, frequency, interval = 1) {
  const safeInterval = Math.max(1, Number(interval) || 1);

  if (frequency === "weekly") return addDays(date, 7 * safeInterval);
  if (frequency === "yearly") return addYears(date, safeInterval);
  if (frequency === "custom") return addDays(date, safeInterval);
  return addMonths(date, safeInterval);
}

export function normalizeRecurringPayment(payment, defaults = {}) {
  const currency = payment?.currency || defaults.defaultCurrency || BASE_CURRENCY;
  const createdAt = payment?.createdAt || new Date().toISOString();

  return {
    id: payment?.id || "",
    name: String(payment?.name || payment?.productName || "").trim(),
    amount: Number(payment?.amount || 0),
    currency,
    category: cleanCurrencyFromText(payment?.category, "Other"),
    paymentMethod: cleanCurrencyFromText(
      payment?.paymentMethod || payment?.payment_method,
      "Cash"
    ),
    frequency: normalizeFrequency(payment?.frequency),
    interval: Math.max(1, Number(payment?.interval || 1)),
    startDate: normalizeDateKey(payment?.startDate || payment?.start_date),
    nextDueDate: normalizeDateKey(
      payment?.nextDueDate || payment?.next_due_date || payment?.startDate
    ),
    endDate: payment?.endDate ? normalizeDateKey(payment.endDate) : null,
    note: String(payment?.note || "").trim(),
    tags: parseTags(payment?.tags),
    status: normalizeRecurringStatus(payment?.status),
    autoCreateTransaction: Boolean(payment?.autoCreateTransaction),
    reminderDaysBefore: Math.max(
      0,
      Number(
        payment?.reminderDaysBefore ??
          payment?.reminder_days_before ??
          defaults.defaultReminderDaysBefore ??
          3
      ) || 0
    ),
    createdAt,
    updatedAt: payment?.updatedAt || createdAt,
  };
}

export function isRecurringPaymentActive(payment, today = new Date()) {
  const entry = normalizeRecurringPayment(payment);
  const todayKey = getLocalDateKey(today);

  return (
    entry.status === "active" &&
    (!entry.endDate || entry.endDate >= todayKey)
  );
}

export function daysUntilDue(payment, today = new Date()) {
  const entry = normalizeRecurringPayment(payment);
  const todayDate = parseLocalDateKey(getLocalDateKey(today));
  const dueDate = parseLocalDateKey(entry.nextDueDate);
  const msPerDay = 24 * 60 * 60 * 1000;

  return Math.round((dueDate - todayDate) / msPerDay);
}

export function getRecurringPaymentStatus(payment, today = new Date()) {
  const entry = normalizeRecurringPayment(payment);
  if (entry.status === "paused") return "paused";
  if (entry.status === "ended") return "ended";

  const days = daysUntilDue(entry, today);
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  if (days <= 7) return "soon";
  return "later";
}

export function calculateNextDueDate(currentDueDate, frequency, options = {}) {
  const interval = Math.max(1, Number(options.interval || 1));
  const todayKey = getLocalDateKey(options.today || options.now || new Date());
  let next = advanceRecurringDate(
    parseLocalDateKey(normalizeDateKey(currentDueDate)),
    normalizeFrequency(frequency),
    interval
  );

  if (options.allowTodayOrPast) return getLocalDateKey(next);

  while (getLocalDateKey(next) <= todayKey) {
    next = advanceRecurringDate(next, normalizeFrequency(frequency), interval);
  }

  return getLocalDateKey(next);
}

export function getUpcomingRecurringPayments(payments, options = {}) {
  const today = options.today || options.now || new Date();
  const showOverdueFirst = options.showOverdueFirst !== false;
  const grouped = {
    overdue: [],
    today: [],
    soon: [],
    later: [],
    paused: [],
    ended: [],
  };

  const all = payments
    .map((payment) => normalizeRecurringPayment(payment, options.defaults || {}))
    .filter((payment) => payment.id && payment.name)
    .map((payment) => {
      const days = daysUntilDue(payment, today);
      const dueStatus = getRecurringPaymentStatus(payment, today);
      const reminderActive =
        payment.status === "active" &&
        days >= 0 &&
        payment.reminderDaysBefore > 0 &&
        days <= payment.reminderDaysBefore;

      return {
        ...payment,
        daysUntil: days,
        dueStatus,
        reminderActive,
      };
    })
    .sort((a, b) => {
      if (showOverdueFirst && a.dueStatus !== b.dueStatus) {
        const order = {
          overdue: 0,
          today: 1,
          soon: 2,
          later: 3,
          paused: 4,
          ended: 5,
        };
        return order[a.dueStatus] - order[b.dueStatus];
      }
      return a.nextDueDate.localeCompare(b.nextDueDate);
    });

  all.forEach((payment) => {
    if (grouped[payment.dueStatus]) grouped[payment.dueStatus].push(payment);
  });

  return { all, grouped };
}

export function createTransactionFromRecurringPayment(payment, paidDate = new Date()) {
  const entry = normalizeRecurringPayment(payment);
  const tags = parseTags([...entry.tags, "recurring"]);

  return {
    amount: toBaseAmount(entry.amount, entry.currency),
    productName: entry.name,
    timestamp: new Date(paidDate).toISOString(),
    currency: entry.currency,
    originalAmount: entry.amount,
    category: entry.category,
    tags,
    paymentMethod: entry.paymentMethod,
    note: entry.note || null,
    isRecurring: false,
    recurrenceInterval: null,
    sourceRecurringPaymentId: entry.id,
    isRecurringGenerated: true,
  };
}

export function getMonthlyProjectedSpending(
  transactions,
  recurringPayments,
  options = {}
) {
  const now = options.now || new Date();
  const monthDate = options.monthDate || now;
  const monthStartKey = getLocalDateKey(startOfMonth(monthDate));
  const monthEndKey = getLocalDateKey(
    new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
  );
  const spent = transactions
    .map(normalizeSpendLog)
    .reduce((sum, log) => sum + log.amount, 0);
  const upcomingPayments = recurringPayments
    .map((payment) => normalizeRecurringPayment(payment))
    .filter(
      (payment) =>
        isRecurringPaymentActive(payment, now) &&
        payment.nextDueDate >= monthStartKey &&
        payment.nextDueDate <= monthEndKey
    );
  const upcomingPlanned = upcomingPayments.reduce(
    (sum, payment) => sum + toBaseAmount(payment.amount, payment.currency),
    0
  );

  return {
    spent,
    upcomingPlanned,
    projectedTotal: spent + upcomingPlanned,
    upcomingPayments,
  };
}
