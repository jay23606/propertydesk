const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadAuthFeatures(context) {
  for (const filename of [
    "app-state.js",
    "auth-screens.js",
    "auth-recovery-view.js",
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

function loadWorkspaceFeatures(context) {
  for (const filename of [
    "profile-display.js",
    "profile-settings-view.js",
    "profile-settings.js",
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
    "transaction-payloads.js",
    "transaction-repository.js",
    "transaction-inserts.js",
    "payment-entry-view.js",
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

function loadPropertyAndAccountForms(context) {
  for (const filename of [
    "property-form-view.js",
    "property-repository.js",
    "property-maintenance.js",
    "property-form.js",
    "account-repository.js",
    "account-maintenance.js",
    "account-form-model.js",
    "account-payload.js",
    "account-form-view.js",
    "account-form.js",
  ]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
      context,
    );
  }
}

function loadImportFeatures(context) {
  require("../features/money-input-utils.js");
  context.window.PropertyDeskCsvParser = require("../csv-parser.js");
  context.window.PropertyDeskImportUtils = require("../import-utils.js");
  for (const filename of [
    "account-import-payload.js",
    "csv-import-file.js",
    "import-review.js",
    "transaction-import-workflow.js",
    "account-import.js",
    "payment-import.js",
    "expense-import.js",
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
  loadAuthFeatures,
  loadWorkspaceFeatures,
  loadLedgerEntryForms,
  loadPropertyAndAccountForms,
  loadImportFeatures,
  loadImportPreview,
  formElements,
};
