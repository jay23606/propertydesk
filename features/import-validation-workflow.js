/* Compose the domain validators used by account and transaction CSV imports. */
(() => {
  "use strict";

  function createImportValidationWorkflow({ workflows, modules }) {
    const csvValueUtils = workflows.csvValueUtils.create({
      modules: { currencyUtils: modules.currencyUtils },
    });
    const accountImportTerms = workflows.accountImportTerms.create({
      modules: {
        csvValueUtils,
        domainOptions: modules.domainOptions,
      },
    });
    const paymentImportAllocation = workflows.paymentImportAllocation.create({
      modules: {
        csvValueUtils,
        currencyUtils: modules.currencyUtils,
        displayUtils: modules.displayUtils,
      },
    });
    const validators = workflows.validationApi.create({
      account: {
        validator: modules.accountValidation,
        modules: {
          importRows: modules.importRows,
          csvValueUtils,
          identity: modules.accountImportIdentity,
          domainOptions: modules.domainOptions,
          terms: accountImportTerms,
          emailAddresses: modules.emailAddresses,
        },
      },
      expense: {
        validator: modules.expenseValidation,
        modules: {
          importRows: modules.importRows,
          csvValueUtils,
          transactionOptions: modules.transactionOptions,
          expenseAccountPolicy: modules.expenseAccountPolicy,
        },
      },
      payment: {
        validator: modules.paymentValidation,
        modules: {
          importRows: modules.importRows,
          csvValueUtils,
          paymentAllocation: paymentImportAllocation,
          transactionOptions: modules.transactionOptions,
        },
      },
    });

    return Object.freeze({ validators });
  }

  window.PropertyDeskImportValidationWorkflow = Object.freeze({
    create: createImportValidationWorkflow,
  });
})();
