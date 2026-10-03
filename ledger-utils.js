/* Pure posted-ledger calculations shared by the app and its tests. */
(() => {
  'use strict';

  function isPosted(transaction) {
    return !transaction?.status || transaction.status === 'posted';
  }

  function sumPosted(transactions, amountField = 'amount') {
    return transactions.filter(isPosted).reduce((sum, transaction) => sum + Number(transaction[amountField] || 0), 0);
  }

  function principalBalance(originalPrincipal, payments, openingBalance = originalPrincipal, openingDate = null) {
    const eligible = openingDate
      ? payments.filter(payment => !payment.received_date || String(payment.received_date) > String(openingDate))
      : payments;
    return Math.max(0, Number(openingBalance ?? originalPrincipal ?? 0) - sumPosted(eligible, 'principal_amount'));
  }

  function amortizationSchedule(originalPrincipal, annualRate, termMonths, startDate, principalInterestAmount = null) {
    const principal = Number(originalPrincipal || 0), months = Number(termMonths || 0);
    if (!Number.isFinite(principal) || principal <= 0 || !Number.isInteger(months) || months <= 0) return [];
    const rate = Number(annualRate || 0) / 100 / 12;
    if (!Number.isFinite(rate) || rate < 0) return [];
    const specifiedPayment = Number(principalInterestAmount || 0);
    const payment = specifiedPayment > 0
      ? specifiedPayment
      : rate ? principal * rate / (1 - Math.pow(1 + rate, -months)) : principal / months;
    if (!Number.isFinite(payment) || payment <= 0) return [];
    const anchor = /^\d{4}-\d{2}-\d{2}$/.test(String(startDate || '')) ? new Date(`${startDate}T12:00:00`) : new Date();
    const dueDate = offset => {
      const day = anchor.getDate(), first = new Date(anchor.getFullYear(), anchor.getMonth() + offset, 1, 12);
      const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0, 12).getDate();
      first.setDate(Math.min(day, lastDay));
      return `${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, '0')}-${String(first.getDate()).padStart(2, '0')}`;
    };
    const cents = value => Math.round((value + Number.EPSILON) * 100) / 100;
    let balance = cents(principal), rows = [];
    for (let i = 1; i <= Math.min(months, 600) && balance > 0.005; i++) {
      const interest = cents(balance * rate);
      const principalPart = cents(Math.min(balance, Math.max(0, payment - interest)));
      balance = cents(Math.max(0, balance - principalPart));
      rows.push({ i, date: dueDate(i), payment: cents(interest + principalPart), principal: principalPart, interest, balance });
    }
    return rows;
  }

  const helpers = Object.freeze({ amortizationSchedule, isPosted, principalBalance, sumPosted });
  globalThis.PropertyDeskLedgerUtils = helpers;
  if (typeof module !== 'undefined' && module.exports) module.exports = helpers;
})();
