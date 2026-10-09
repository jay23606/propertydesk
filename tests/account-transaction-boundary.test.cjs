const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("app composes independent property and account forms before action routing", () => {
  const root = path.join(__dirname, "..");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");

  assert.match(app, /PropertyDeskPropertyAccountFormsSetup\.create\(/);
  assert.doesNotMatch(app, /PropertyDesk(?:Property|Account)Form\.create\(/);
  assert.match(app, /PropertyDeskTransactionWorkspaceSetup\.create\(/);
  const composition = fs.readFileSync(
    path.join(root, "features", "transaction-workspace-workflow.js"),
    "utf8",
  );
  const transactionSetup = fs.readFileSync(
    path.join(root, "features", "transaction-workspace-setup.js"),
    "utf8",
  );
  const formOptions = fs.readFileSync(
    path.join(root, "features", "form-options.js"),
    "utf8",
  );
  assert.doesNotMatch(formOptions, /\bstate\b/);
  assert.match(
    composition,
    /maintenanceWorkflows\.workflow\.create\([\s\S]*?return ledgerWorkflows\.workflow\.create\(\{\s*saveCorrection: transactionMaintenance\.saveCorrection,[\s\S]*?createTransactionActionHandlers:\s*transactionMaintenance\.createTransactionActionHandlers,/,
  );
  assert.match(transactionSetup, /workflows\.workspace\.create\(/);
  assert.match(
    transactionSetup,
    /getPendingCorrection: records\.getPendingCorrection/,
  );
  assert.doesNotMatch(transactionSetup, /\bstate\./);
  assert.match(app, /records: stateAccess\.transactions/);
  assert.match(app, /records: stateAccess\.accountDeposit/);
  assert.match(
    composition,
    /entries: \{[\s\S]*?transactionRepository: \{\s*insertPayment: services\.transactionRepository\.insertPayment,\s*insertExpense: services\.transactionRepository\.insertExpense,/,
  );
  assert.doesNotMatch(
    composition,
    /\bstate\s*,/,
    "transaction setup receives record accessors instead of the app state object",
  );
  assert.match(
    composition,
    /getPayments: records\.getPayments,[\s\S]*?getExpenses: records\.getExpenses/,
  );
  assert.match(
    composition,
    /correction: \{[\s\S]*?getAccounts: records\.getAccounts,[\s\S]*?getPayments: records\.getPayments,[\s\S]*?getExpenses: records\.getExpenses/,
  );
  assert.match(
    composition,
    /workflows: \{[\s\S]*?correctionModel: maintenanceWorkflows\.correctionModel/,
  );
  assert.doesNotMatch(
    composition.match(
      /correction: \{[\s\S]*?\n      \},\n      voiding:/,
    )?.[0] || "",
    /\bstate\s*,/,
    "transaction correction receives specific state accessors, not the app state object",
  );
  assert.match(
    app,
    /PropertyDeskCreateActions\.create\([\s\S]*?resetPropertyForm: propertyAccountForms\.resetPropertyForm,[\s\S]*?openAccountForProperty: propertyAccountForms\.openAccountForProperty,[\s\S]*?openPayment,[\s\S]*?openExpense,/,
  );
  assert.match(
    app,
    /PropertyDeskCreateActions\.create\(\{[\s\S]*?stateAccess\.createActions/,
  );
  const createActions = fs.readFileSync(
    path.join(root, "features", "create-actions.js"),
    "utf8",
  );
  assert.doesNotMatch(createActions, /\bstate\b/);
  assert.match(
    app,
    /editAccount: propertyAccountForms\.editAccount,[\s\S]*?openAccountForProperty: propertyAccountForms\.openAccountForProperty/,
  );
  assert.match(
    app,
    /propertyAccountForms\.attachPropertyFormEvents,[\s\S]*?propertyAccountForms\.attachAccountFormEvents,[\s\S]*?attachLedgerEntryFormEvents/,
  );

  const transactionWorkflow = fs.readFileSync(
    path.join(root, "features", "ledger-workflow.js"),
    "utf8",
  );
  const entryCoordinator = fs.readFileSync(
    path.join(root, "features", "ledger-entry-forms.js"),
    "utf8",
  );
  assert.doesNotMatch(entryCoordinator, /\bstate\b/);
  for (const filename of [
    "ledger-workflow.js",
    "ledger-entry-save-workflow.js",
    "payment-entry-form.js",
    "expense-entry-form.js",
    "payment-entry-view.js",
    "expense-entry-view.js",
    "property-payment-action.js",
  ]) {
    assert.doesNotMatch(
      fs.readFileSync(path.join(root, "features", filename), "utf8"),
      /\bstate\b/,
      `${filename} should use its scoped record accessors`,
    );
  }
  assert.match(
    transactionWorkflow,
    /function createLedgerWorkflow\(\{\s*saveCorrection,\s*createTransactionActionHandlers,[\s\S]*?saveCorrection,[\s\S]*?workflows\.views\.create\(\{[\s\S]*?sumOperatingExpenses,[\s\S]*?\}\)[\s\S]*?createTransactionActionHandlers\([\s\S]*?openPayment: ledgerEntryForms\.openPayment/,
  );
  const transactionMaintenance = fs.readFileSync(
    path.join(root, "features", "transaction-maintenance-workflow.js"),
    "utf8",
  );
  assert.match(
    transactionMaintenance,
    /correctionModelWorkflow\.create\([\s\S]*?correctionWorkflow\.create\([\s\S]*?findCorrectionTarget: correctionModel\.findCorrectionTarget,[\s\S]*?voidMaintenanceWorkflow\.create\([\s\S]*?voidEntryWorkflow\.create\(/,
  );
  assert.match(app, /transactionRepository: repositories\.transactions/);
  assert.match(
    composition,
    /resolveVoidTarget: maintenanceWorkflows\.voidModel\.resolveVoidTarget/,
  );
  assert.match(
    composition,
    /buildVoidPayload: maintenanceWorkflows\.voidModel\.buildVoidPayload/,
  );
  assert.match(
    transactionMaintenance,
    /correctionModelWorkflow\.create\(\{[\s\S]*?getPayments: correctionContext\.getPayments,[\s\S]*?getExpenses: correctionContext\.getExpenses,[\s\S]*?getAccounts: correctionContext\.getAccounts/,
  );
  assert.match(
    transactionMaintenance,
    /findCorrectionTarget: correctionModel\.findCorrectionTarget/,
  );
});

test("transaction workflows receive only scoped record getters", () => {
  const root = path.join(__dirname, "..");
  for (const filename of [
    "features/transaction-inserts.js",
    "features/transaction-workspace-workflow.js",
  ]) {
    const source = fs.readFileSync(path.join(root, filename), "utf8");
    assert.doesNotMatch(source, /\bstate\b/, filename);
  }
});
