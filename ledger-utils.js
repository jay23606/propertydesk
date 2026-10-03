/* Pure posted-ledger calculations shared by the app and its tests. */
(() => {
  'use strict';

  function isPosted(transaction) {
    return !transaction?.status || transaction.status === 'posted';
  }

  function sumPosted(transactions, amountField = 'amount') {
    return transactions.filter(isPosted).reduce((sum, transaction) => sum + Number(transaction[amountField] || 0), 0);
  }

  function principalBalance(originalPrincipal, payments) {
    return Math.max(0, Number(originalPrincipal || 0) - sumPosted(payments, 'principal_amount'));
  }

  const helpers = Object.freeze({ isPosted, principalBalance, sumPosted });
  globalThis.PropertyDeskLedgerUtils = helpers;
  if (typeof module !== 'undefined' && module.exports) module.exports = helpers;
})();
