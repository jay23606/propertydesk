/* Collect the workflow modules owned by CSV import and reconciliation. */
(() => {
  "use strict";

  function createImportWorkspaceModuleCatalog() {
    return Object.freeze({
      imports: window.PropertyDeskImportWorkspaceWorkflow,
      csvValueUtils: window.PropertyDeskCsvValueUtils,
      accountImportTerms: window.PropertyDeskAccountImportTerms,
      paymentImportAllocation: window.PropertyDeskPaymentImportAllocation,
      validationApi: window.PropertyDeskImportValidationApi,
      feature: window.PropertyDeskImportFeature,
      validation: window.PropertyDeskImportValidationWorkflow,
      modules: {
        currencyUtils: window.PropertyDeskCurrencyUtils,
        displayUtils: window.PropertyDeskDisplayUtils,
        domainOptions: window.PropertyDeskDomainOptions,
        transactionOptions: window.PropertyDeskTransactionOptions,
        expenseAccountPolicy: window.PropertyDeskExpenseAccountPolicy,
        emailAddresses: window.PropertyDeskEmailAddressUtils,
        accountValidation: window.PropertyDeskAccountImportValidation,
        accountImportIdentity: window.PropertyDeskAccountImportIdentity,
        expenseValidation: window.PropertyDeskExpenseImportValidation,
        paymentValidation: window.PropertyDeskPaymentImportValidation,
        importRows: window.PropertyDeskImportRows,
        csvParser: window.PropertyDeskCsvParser,
        preview: {
          create: window.PropertyDeskImportPreview.create,
          modules: {
            correctionView: window.PropertyDeskImportCorrectionView,
            rendering: window.PropertyDeskImportPreviewRendering,
            table: window.PropertyDeskImportPreviewTable,
          },
        },
        previewEvents: window.PropertyDeskImportPreviewEvents,
        commit: {
          create: window.PropertyDeskImportCommit.create,
          modules: {
            batchReconciliation: window.PropertyDeskImportBatchReconciliation,
            reporting: window.PropertyDeskImportCommitReporting,
          },
        },
        review: window.PropertyDeskImportReview,
        accountImport: window.PropertyDeskAccountImport,
        accountImportPayload: window.PropertyDeskAccountImportPayload,
        csvImportFile: window.PropertyDeskCsvImportFile,
        transactionImport: window.PropertyDeskTransactionImportFeature,
        paymentImport: window.PropertyDeskPaymentImport,
        expenseImport: window.PropertyDeskExpenseImport,
        transactionImportWorkflow: window.PropertyDeskTransactionImportWorkflow,
      },
    });
  }

  window.PropertyDeskImportWorkspaceModuleCatalog = Object.freeze({
    create: createImportWorkspaceModuleCatalog,
  });
})();
