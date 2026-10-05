/* Publish the stable CSV import validation API. */
(() => {
  'use strict';

  const workflows = Object.freeze({
    validateAccountRows:
      globalThis.PropertyDeskAccountImportValidation.validateAccountRows,
    validateExpenseRows:
      globalThis.PropertyDeskExpenseImportValidation.validateExpenseRows,
    validatePaymentRows:
      globalThis.PropertyDeskPaymentImportValidation.validatePaymentRows,
  });
  globalThis.PropertyDeskImportWorkflows = workflows;
  if (typeof module !== 'undefined' && module.exports)
    module.exports = workflows;
})();
