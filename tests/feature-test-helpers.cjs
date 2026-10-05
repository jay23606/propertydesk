const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadAuthFeatures(context) {
  for (const filename of ["app-state.js", "auth-screens.js", "auth-recovery.js", "auth-session.js", "auth-form.js", "auth.js"]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
      context,
    );
  }
}

function loadWorkspaceFeatures(context) {
  for (const filename of ["profile-settings.js", "workspace-members.js", "workspace.js"]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
      context,
    );
  }
}

function loadLedgerEntryForms(context) {
  for (const filename of [
    "transaction-payloads.js",
    "payment-entry-view.js",
    "payment-entry-form.js",
    "expense-entry-form.js",
    "ledger-entry-forms.js",
  ]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
      context,
    );
  }
}

function loadPropertyAccountForms(context) {
  for (const filename of [
    "property-form.js",
    "account-form-model.js",
    "account-payload.js",
    "account-form-view.js",
    "account-form.js",
    "property-account-forms.js",
  ]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
      context,
    );
  }
}

function loadImportFeatures(context) {
  for (const filename of [
    "account-import.js",
    "payment-import.js",
    "expense-import.js",
    "transaction-imports.js",
    "imports.js",
  ]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
      context,
    );
  }
}

function loadImportPreview(context) {
  for (const filename of ["import-preview-rendering.js", "import-preview.js", "import-preview-events.js"]) {
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

module.exports = { loadAuthFeatures, loadWorkspaceFeatures, loadLedgerEntryForms, loadPropertyAccountForms, loadImportFeatures, loadImportPreview, formElements };
