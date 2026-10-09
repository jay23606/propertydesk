const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("app composes independent property and account forms before action routing", () => {
  const root = path.join(__dirname, "..");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");

  assert.match(app, /PropertyDeskPropertyAccountFormsWorkflow\.create\(/);
  assert.doesNotMatch(app, /PropertyDesk(?:Property|Account)Form\.create\(/);
  assert.match(app, /PropertyDeskTransactionMaintenanceWorkflow\.create\(/);
  assert.match(app, /PropertyDeskLedgerWorkflow\.create\(/);
  assert.match(
    app,
    /const transactionMaintenance =\s*window\.PropertyDeskTransactionMaintenanceWorkflow\.create\([\s\S]*?\);\s*const ledgerWorkflow = window\.PropertyDeskLedgerWorkflow\.create\(\{\s*maintenance: transactionMaintenance,/,
  );
  assert.match(
    app,
    /PropertyDeskCreateActions\.create\([\s\S]*?resetPropertyForm: propertyAccountForms\.resetPropertyForm,[\s\S]*?openAccountForProperty: propertyAccountForms\.openAccountForProperty,[\s\S]*?openPayment,[\s\S]*?openExpense,/,
  );
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
  assert.match(
    transactionWorkflow,
    /const \{ saveCorrection, createTransactionActionHandlers \} = maintenance;[\s\S]*?saveCorrection,[\s\S]*?workflows\.views\.create\(\{[\s\S]*?sumOperatingExpenses,[\s\S]*?\}\)[\s\S]*?createTransactionActionHandlers\([\s\S]*?openPayment: ledgerEntryForms\.openPayment/,
  );
  const transactionMaintenance = fs.readFileSync(
    path.join(root, "features", "transaction-maintenance-workflow.js"),
    "utf8",
  );
  assert.match(
    transactionMaintenance,
    /correctionWorkflow\.create\([\s\S]*?voidMaintenanceWorkflow\.create\([\s\S]*?voidEntryWorkflow\.create\(/,
  );
});
