const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadRepositoryWriteFeedback(context) {
  vm.runInContext(
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "features",
        "workspace-write-reconciliation.js",
      ),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "features",
        "workspace-record-write-workflow.js",
      ),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "repository-write-feedback.js"),
      "utf8",
    ),
    context,
  );
}

function createRepositoryWriteFeedback(context) {
  const feedback = context.window.PropertyDeskRepositoryWriteFeedback;
  if (typeof feedback?.create !== "function") return feedback;
  return feedback.create({
    modules: {
      reconciliation: context.window.PropertyDeskWorkspaceWriteReconciliation,
      recordWrites: context.window.PropertyDeskWorkspaceRecordWriteWorkflow,
    },
  });
}

function loadAuthFeatures(context) {
  for (const filename of [
    "app-state.js",
    "auth-client.js",
    "auth-screens.js",
    "auth-recovery-view.js",
    "auth-reset-request.js",
    "auth-recovery.js",
    "auth-session.js",
    "auth-form-view.js",
    "auth-form.js",
    "auth.js",
  ]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
      context,
    );
  }
}

function authFeatureModules(context) {
  const { window } = context;
  return {
    screens: window.PropertyDeskAuthScreens,
    form: window.PropertyDeskAuthForm,
    formView: window.PropertyDeskAuthFormView,
    recovery: window.PropertyDeskAuthRecovery,
    recoveryView: window.PropertyDeskAuthRecoveryView,
    resetRequest: window.PropertyDeskAuthResetRequest,
    session: window.PropertyDeskAuthSession,
    resetWorkspaceState: window.PropertyDeskAppState.resetWorkspaceState,
  };
}

function createAuthClient(context, state) {
  return context.window.PropertyDeskAuthClient.create({
    getClient: () => state.client,
  });
}

function loadWorkspaceFeatures(context) {
  context.window.PropertyDeskWorkspaceReminderWorkflow ||= {
    create: () => ({
      renderReminderActivity() {},
    }),
  };
  for (const filename of [
    "auth-client.js",
    "profile-display.js",
    "profile-settings-view.js",
    "profile-settings.js",
    "workspace-profile-workflow.js",
    "workspace-write-reconciliation.js",
    "workspace-record-write-workflow.js",
    "repository-write-feedback.js",
    "workspace-members-view.js",
    "workspace-member-repository.js",
    "workspace-member-maintenance.js",
    "workspace-members.js",
    "workspace.js",
  ]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
      context,
    );
  }
  return {
    writeFeedback: createRepositoryWriteFeedback(context),
    profile: context.window.PropertyDeskWorkspaceProfileWorkflow,
    memberView: context.window.PropertyDeskWorkspaceMembersView,
    memberMaintenance: context.window.PropertyDeskWorkspaceMemberMaintenance,
    members: context.window.PropertyDeskWorkspaceMembers,
    profileModules: {
      display: context.window.PropertyDeskProfileDisplay,
      view: context.window.PropertyDeskProfileSettingsView,
      settings: context.window.PropertyDeskProfileSettings,
    },
  };
}

function loadLedgerEntryForms(context) {
  for (const filename of [
    "transaction-options.js",
    "expense-account-policy.js",
    "transaction-payloads.js",
    "repository-query-utils.js",
    "workspace-write-reconciliation.js",
    "workspace-record-write-workflow.js",
    "repository-write-feedback.js",
    "transaction-repository.js",
    "transaction-inserts.js",
    "ledger-entry-save-workflow.js",
    "payment-entry-view.js",
    "property-payment-action.js",
    "payment-entry-form.js",
    "expense-entry-view.js",
    "expense-entry-form.js",
    "ledger-entry-forms.js",
  ]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
      context,
    );
  }
}

function ledgerEntryDependencies(context, state = {}) {
  const repositoryFactory = context.window.PropertyDeskTransactionRepository;
  return {
    transactionRepository: repositoryFactory.create
      ? repositoryFactory.create({
          getClient: () => state.client,
          queryUtils: context.window.PropertyDeskRepositoryQueryUtils,
        })
      : repositoryFactory,
    transactionPayloads: context.window.PropertyDeskTransactionPayloads,
    writeFeedback: createRepositoryWriteFeedback(context),
    selectRecordWriteCompletion:
      context.window.PropertyDeskWorkspaceRecordWriteWorkflow
        ?.selectRecordWriteCompletion,
    expenseAccountPolicy: context.window.PropertyDeskExpenseAccountPolicy,
    modules: {
      transactionInserts: context.window.PropertyDeskTransactionInserts,
      saveWorkflow: context.window.PropertyDeskLedgerEntrySaveWorkflow,
      paymentForm: context.window.PropertyDeskPaymentEntryForm,
      expenseForm: context.window.PropertyDeskExpenseEntryForm,
    },
    workflows: {
      paymentView: context.window.PropertyDeskPaymentEntryView,
      expenseView: context.window.PropertyDeskExpenseEntryView,
      propertyPaymentAction: context.window.PropertyDeskPropertyPaymentAction,
    },
  };
}

function workspaceRecordWriteDependencies(context) {
  return {
    writeFeedback: createRepositoryWriteFeedback(context),
    recordSaveMaintenance:
      context.window.PropertyDeskWorkspaceRecordSaveMaintenance,
    selectRecordWriteCompletion:
      context.window.PropertyDeskWorkspaceRecordWriteWorkflow
        .selectRecordWriteCompletion,
  };
}

function accountFormDependencies(context, state = {}) {
  return {
    writeFeedback: createRepositoryWriteFeedback(context),
    selectRecordWriteCompletion:
      context.window.PropertyDeskWorkspaceRecordWriteWorkflow
        ?.selectRecordWriteCompletion,
    repository: context.window.PropertyDeskAccountRepository.create({
      queryUtils: context.window.PropertyDeskRepositoryQueryUtils,
      getClient: () => state.client,
    }),
    workflows: {
      view: context.window.PropertyDeskAccountFormView,
      saveWorkflow: context.window.PropertyDeskWorkspaceFormSaveWorkflow,
      maintenance: context.window.PropertyDeskAccountFormMaintenance,
      recordSaveMaintenance:
        context.window.PropertyDeskWorkspaceRecordSaveMaintenance,
      propertyAction: context.window.PropertyDeskPropertyAccountAction,
    },
  };
}

function accountFormModel(context) {
  return context.window.PropertyDeskAccountFormModel.create(
    context.window.PropertyDeskEmailAddressUtils,
  );
}

function propertyFormDependencies(context, state = {}) {
  return {
    writeFeedback: createRepositoryWriteFeedback(context),
    selectRecordWriteCompletion:
      context.window.PropertyDeskWorkspaceRecordWriteWorkflow
        ?.selectRecordWriteCompletion,
    repository: context.window.PropertyDeskPropertyRepository.create({
      queryUtils: context.window.PropertyDeskRepositoryQueryUtils,
      getClient: () => state.client,
    }),
    workflows: {
      view: context.window.PropertyDeskPropertyFormView,
      saveWorkflow: context.window.PropertyDeskWorkspaceFormSaveWorkflow,
      maintenance: context.window.PropertyDeskPropertySaveMaintenance,
      recordSaveMaintenance:
        context.window.PropertyDeskWorkspaceRecordSaveMaintenance,
    },
  };
}

function loadPropertyAndAccountForms(context) {
  for (const filename of [
    "repository-query-utils.js",
    "workspace-write-reconciliation.js",
    "workspace-record-write-workflow.js",
    "repository-write-feedback.js",
    "workspace-record-save-maintenance.js",
    "property-form-view.js",
    "property-repository.js",
    "property-save-maintenance.js",
    "workspace-form-save-workflow.js",
    "property-form.js",
    "account-repository.js",
    "account-form-maintenance.js",
    "email-address-utils.js",
    "account-form-model.js",
    "account-payload.js",
    "account-form-view.js",
    "account-form.js",
    "property-account-action.js",
  ]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
      context,
    );
  }
}

function loadImportFeatures(context) {
  loadImportPreview(context);
  require("../features/currency-utils.js");
  context.window.PropertyDeskCsvParser = require("../features/csv-parser.js");
  context.window.PropertyDeskCsvValueUtils =
    require("../features/csv-value-utils.js").create({
      modules: { currencyUtils: globalThis.PropertyDeskCurrencyUtils },
    });
  context.window.PropertyDeskImportRows = require("../features/import-row-utils.js");
  for (const filename of [
    "account-import-payload.js",
    "csv-import-file.js",
    "import-review.js",
    "transaction-import-workflow.js",
    "account-import.js",
    "payment-import.js",
    "expense-import.js",
    "transaction-import-feature.js",
    "import-repository.js",
    "import-batch-reconciliation.js",
    "import-commit-reporting.js",
    "import-commit.js",
    "imports.js",
  ]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
      context,
    );
  }
}

function importFeatureModules(context) {
  const { window } = context;
  return {
    importRows: window.PropertyDeskImportRows,
    csvParser: window.PropertyDeskCsvParser,
    validators: window.PropertyDeskImportWorkflows,
    preview: {
      create: window.PropertyDeskImportPreview.create,
      modules: importPreviewModules(context),
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
  };
}

function loadImportPreview(context) {
  for (const filename of [
    "import-correction-view.js",
    "import-preview-table.js",
    "import-preview-rendering.js",
    "import-preview.js",
    "import-preview-events.js",
  ]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
      context,
    );
  }
}

function importPreviewModules(context) {
  return {
    correctionView: context.window.PropertyDeskImportCorrectionView,
    rendering: context.window.PropertyDeskImportPreviewRendering,
    table: context.window.PropertyDeskImportPreviewTable,
  };
}

function formElements(values = {}) {
  const elements = new Map();
  return (id) => {
    if (!elements.has(id)) {
      elements.set(id, {
        value: values[id] ?? "",
        checked: false,
        textContent: "",
        innerHTML: "",
        classList: { add() {}, remove() {}, toggle() {} },
        reset() {},
        focus() {},
        dispatchEvent() {},
        querySelector: () => ({ textContent: "" }),
        addEventListener() {},
      });
    }
    return elements.get(id);
  };
}

module.exports = {
  loadRepositoryWriteFeedback,
  createRepositoryWriteFeedback,
  loadAuthFeatures,
  authFeatureModules,
  createAuthClient,
  loadWorkspaceFeatures,
  loadLedgerEntryForms,
  ledgerEntryDependencies,
  workspaceRecordWriteDependencies,
  accountFormDependencies,
  accountFormModel,
  propertyFormDependencies,
  loadPropertyAndAccountForms,
  loadImportFeatures,
  importFeatureModules,
  loadImportPreview,
  importPreviewModules,
  formElements,
};
