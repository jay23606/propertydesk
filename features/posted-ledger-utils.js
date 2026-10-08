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

  function isDueReducingPaymentInMonth(payment, accountId, yearMonth) {
    return (
      payment.account_id === accountId &&
      isDueReducingPayment(payment) &&
      String(payment.received_date || "").slice(0, 7) === yearMonth
    );
  }

  function postedOnOrAfter(transactions, dateField, startDate) {
    return transactions.filter(
      (transaction) =>
        isPosted(transaction) && String(transaction[dateField]) >= startDate,
    );
  }

  function postedPaymentTotalInMonth(payments, accountId, month) {
    const yearMonth = String(month || "").slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(yearMonth)) return 0;
    const total = payments
      .filter((payment) =>
        isDueReducingPaymentInMonth(payment, accountId, yearMonth),
      )
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    return roundCurrency(total);
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

  const roundCurrency = globalThis.PropertyDeskCurrencyUtils?.roundCurrency;
  if (!roundCurrency)
    throw new Error(
      "PropertyDeskCurrencyUtils must load before PropertyDeskPostedLedgerUtils.",
    );
  const helpers = Object.freeze({
    isDueReducingPayment,
    isPosted,
    paymentStatusInMonth,
    postedOnOrAfter,
    sumIncome,
    sumOperatingExpenses,
    sumPosted,
  });
  globalThis.PropertyDeskPostedLedgerUtils = helpers;
  if (typeof module !== "undefined" && module.exports) module.exports = helpers;
})();
