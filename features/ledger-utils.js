/* Pure posted-ledger calculations shared by the app and its tests. */
(() => {
  "use strict";

  function isPosted(transaction) {
    return !transaction?.status || transaction.status === "posted";
  }

  const excludedDuePaymentCategories = new Set(["deposit", "late_fee"]);

  function isDueReducingPayment(payment) {
    return (
      isPosted(payment) &&
      !excludedDuePaymentCategories.has(payment.income_category)
    );
  }

  function postedOnOrAfter(transactions, dateField, startDate) {
    return transactions.filter(
      (transaction) =>
        isPosted(transaction) && String(transaction[dateField]) >= startDate,
    );
  }

  function hasPostedPaymentInMonth(payments, accountId, month) {
    const yearMonth = String(month || "").slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(yearMonth)) return false;
    return payments.some(
      (payment) =>
        payment.account_id === accountId &&
        isDueReducingPayment(payment) &&
        String(payment.received_date || "").slice(0, 7) === yearMonth,
    );
  }

  function postedPaymentTotalInMonth(payments, accountId, month) {
    const yearMonth = String(month || "").slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(yearMonth)) return 0;
    const total = payments
      .filter(
        (payment) =>
          payment.account_id === accountId &&
          isDueReducingPayment(payment) &&
          String(payment.received_date || "").slice(0, 7) === yearMonth,
      )
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    return Math.round((total + Number.EPSILON) * 100) / 100;
  }

  function paymentStatusInMonth(payments, accountId, month, scheduledAmount) {
    const total = postedPaymentTotalInMonth(payments, accountId, month);
    if (total <= 0) return "none";
    const expected = Number(scheduledAmount || 0);
    return expected > 0 && total + 0.004 >= expected ? "full" : "partial";
  }

  function sumPosted(transactions, amountField = "amount") {
    return transactions
      .filter(isPosted)
      .reduce(
        (sum, transaction) => sum + Number(transaction[amountField] || 0),
        0,
      );
  }

  function sumIncome(transactions, amountField = "amount") {
    return sumPosted(
      transactions.filter(
        (transaction) => transaction.income_category !== "deposit",
      ),
      amountField,
    );
  }

  function sumOperatingExpenses(transactions, amountField = "amount") {
    return sumPosted(
      transactions.filter(
        (transaction) => transaction.category !== "deposit_refund",
      ),
      amountField,
    );
  }

  const scheduleFactory = globalThis.PropertyDeskScheduleUtils;
  if (!scheduleFactory)
    throw new Error(
      "PropertyDeskScheduleUtils must load before PropertyDeskLedgerUtils.",
    );
  const loanFactory = globalThis.PropertyDeskLoanAmortizationUtils;
  if (!loanFactory)
    throw new Error(
      "PropertyDeskLoanAmortizationUtils must load before PropertyDeskLedgerUtils.",
    );
  const schedule = scheduleFactory.create({ isDueReducingPayment });
  const loans = loanFactory.create({ sumPosted });
  const depositFactory = globalThis.PropertyDeskDepositLedgerUtils;
  if (!depositFactory)
    throw new Error(
      "PropertyDeskDepositLedgerUtils must load before PropertyDeskLedgerUtils.",
    );
  const deposits = depositFactory.create({ isPosted });
  const helpers = Object.freeze({
    amountDueSince: schedule.amountDueSince,
    amortizationSchedule: loans.amortizationSchedule,
    hasPostedPaymentInMonth,
    isDueReducingPayment,
    isPosted,
    monthlyScheduledEstimate: schedule.monthlyScheduledEstimate,
    paymentStatusInMonth,
    postedOnOrAfter,
    postedPaymentTotalInMonth,
    principalBalance: loans.principalBalance,
    scheduledLoanBalance: loans.scheduledLoanBalance,
    securityDepositBalance: deposits.securityDepositBalance,
    sumIncome,
    sumOperatingExpenses,
    sumPosted,
    unpaidDueAccrualStart: schedule.unpaidDueAccrualStart,
  });
  globalThis.PropertyDeskLedgerUtils = helpers;
  if (typeof module !== "undefined" && module.exports) module.exports = helpers;
})();
