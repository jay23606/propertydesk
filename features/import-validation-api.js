/* Publish the stable CSV import validation API. */
(() => {
  "use strict";

  function create({ account, expense, payment }) {
    const accountValidation = account.validator.create({
      modules: account.modules,
    });
    const expenseValidation = expense.validator.create({
      modules: expense.modules,
    });
    const paymentValidation = payment.validator.create({
      modules: payment.modules,
    });

    return Object.freeze({
      validateAccountRows: accountValidation.validateAccountRows,
      validateExpenseRows: expenseValidation.validateExpenseRows,
      validatePaymentRows: paymentValidation.validatePaymentRows,
    });
  }

  const api = Object.freeze({ create });
  globalThis.PropertyDeskImportValidationApi = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
