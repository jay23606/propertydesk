const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadRepositoryWriteFeedback(context) {
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "repository-write-feedback.js"),
      "utf8",
    ),
    context,
  );
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

function createAuthClient(context, state) {
  return context.window.PropertyDeskAuthClient.create({
    getClient: () => state.client,
  });
}

function loadWorkspaceFeatures(context) {
  context.window.PropertyDeskWorkspaceReminderWorkflow ||= {
    create: () => ({
      renderReminderActivity() {},
      previewReminderEmail() {},
    }),
  };
  for (const filename of [
    "auth-client.js",
    "profile-display.js",
    "profile-settings-view.js",
    "profile-settings.js",
    "workspace-profile-workflow.js",
    "repository-write-feedback.js",
    "workspace-members-view.js",
    "workspace-member-repository.js",
    "workspace-members.js",
    "workspace.js",
  ]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
      context,
    );
  }
}

function loadLedgerEntryForms(context) {
  for (const filename of [
    "transaction-options.js",
    "expense-account-policy.js",
    "transaction-payloads.js",
    "repository-query-utils.js",
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
      ? repositoryFactory.create({ getClient: () => state.client })
      : repositoryFactory,
    transactionPayloads: context.window.PropertyDeskTransactionPayloads,
  };
}

function accountFormDependencies(context, state = {}) {
  return {
    repository: context.window.PropertyDeskAccountRepository.create({
      getClient: () => state.client,
    }),
  };
}

function propertyFormDependencies(context, state = {}) {
  return {
    repository: context.window.PropertyDeskPropertyRepository.create({
      getClient: () => state.client,
    }),
  };
}

function loadPropertyAndAccountForms(context) {
  for (const filename of [
    "repository-query-utils.js",
    "repository-write-feedback.js",
    "property-form-view.js",
    "property-repository.js",
    "property-maintenance.js",
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
  context.window.PropertyDeskCsvValueUtils = require("../features/csv-value-utils.js");
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
    "import-commit.js",
    "imports.js",
  ]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
      context,
    );
  }
}

function loadImportPreview(context) {
  for (const filename of [
    "import-correction-view.js",
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
  loadAuthFeatures,
  createAuthClient,
  loadWorkspaceFeatures,
  loadLedgerEntryForms,
  ledgerEntryDependencies,
  accountFormDependencies,
  propertyFormDependencies,
  loadPropertyAndAccountForms,
  loadImportFeatures,
  loadImportPreview,
  formElements,
};
