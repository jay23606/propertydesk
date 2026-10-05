/* Pure posted-ledger calculations shared by the app and its tests. */
(() => {
  'use strict';

  function isPosted(transaction) {
    return !transaction?.status || transaction.status === 'posted';
  }

  function hasPostedPaymentInMonth(payments, accountId, month) {
    const yearMonth = String(month || '').slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(yearMonth)) return false;
    return payments.some(
      (payment) =>
        payment.account_id === accountId &&
        isPosted(payment) &&
        !['deposit', 'late_fee'].includes(payment.income_category) &&
        String(payment.received_date || '').slice(0, 7) === yearMonth,
    );
  }

  function postedPaymentTotalInMonth(payments, accountId, month) {
    const yearMonth = String(month || '').slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(yearMonth)) return 0;
    const total = payments
      .filter(
        (payment) =>
          payment.account_id === accountId &&
          isPosted(payment) &&
          !['deposit', 'late_fee'].includes(payment.income_category) &&
          String(payment.received_date || '').slice(0, 7) === yearMonth,
      )
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    return Math.round((total + Number.EPSILON) * 100) / 100;
  }

  function paymentStatusInMonth(payments, accountId, month, scheduledAmount) {
    const total = postedPaymentTotalInMonth(payments, accountId, month);
    if (total <= 0) return 'none';
    const expected = Number(scheduledAmount || 0);
    return expected > 0 && total + 0.004 >= expected ? 'full' : 'partial';
  }

  function sumPosted(transactions, amountField = 'amount') {
    return transactions
      .filter(isPosted)
      .reduce(
        (sum, transaction) => sum + Number(transaction[amountField] || 0),
        0,
      );
  }

  function sumIncome(transactions, amountField = 'amount') {
    return sumPosted(
      transactions.filter(
        (transaction) => transaction.income_category !== 'deposit',
      ),
      amountField,
    );
  }

  function sumOperatingExpenses(transactions, amountField = 'amount') {
    return sumPosted(
      transactions.filter(
        (transaction) => transaction.category !== 'deposit_refund',
      ),
      amountField,
    );
  }

  function securityDepositBalance(entries, payments, expenses) {
    const paymentById = new Map(payments.map((row) => [row.id, row])),
      expenseById = new Map(expenses.map((row) => [row.id, row]));
    const active = entries.filter(
      (row) =>
        row.entry_type === 'retained' ||
        row.entry_type === 'restored' ||
        (row.entry_type === 'received' &&
          isPosted(paymentById.get(row.source_payment_id))) ||
        (row.entry_type === 'refunded' &&
          isPosted(expenseById.get(row.source_expense_id))),
    );
    const totals = { received: 0, refunded: 0, retained: 0, restored: 0 };
    for (const entry of active)
      totals[entry.entry_type] += Number(entry.amount || 0);
    totals.held =
      totals.received - totals.refunded - totals.retained + totals.restored;
    return { active, totals };
  }

  const scheduleFactory = globalThis.PropertyDeskScheduleUtils;
  if (!scheduleFactory) throw new Error('PropertyDeskScheduleUtils must load before PropertyDeskLedgerUtils.');
  const loanFactory = globalThis.PropertyDeskLoanAmortizationUtils;
  if (!loanFactory) throw new Error('PropertyDeskLoanAmortizationUtils must load before PropertyDeskLedgerUtils.');
  const schedule = scheduleFactory.create({ isPosted });
  const loans = loanFactory.create({ sumPosted });
  const helpers = Object.freeze({
    amountDueSince: schedule.amountDueSince,
    amortizationSchedule: loans.amortizationSchedule,
    hasPostedPaymentInMonth,
    isPosted,
    monthlyScheduledEstimate: schedule.monthlyScheduledEstimate,
    paymentStatusInMonth,
    postedPaymentTotalInMonth,
    principalBalance: loans.principalBalance,
    scheduledLoanBalance: loans.scheduledLoanBalance,
    securityDepositBalance,
    sumIncome,
    sumOperatingExpenses,
    sumPosted,
    unpaidDueAccrualStart: schedule.unpaidDueAccrualStart,
  });
  globalThis.PropertyDeskLedgerUtils = helpers;
  if (typeof module !== 'undefined' && module.exports) module.exports = helpers;
})();
