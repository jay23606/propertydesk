const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("app wires account forms and transaction entry through separate workflows", () => {
  const root = path.join(__dirname, "..");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");

  assert.match(app, /PropertyDeskPropertyAccountEntryWorkflow\.create\(/);
  assert.match(app, /PropertyDeskLedgerEntryForms\.create\(/);
  assert.match(app, /PropertyDeskTransactionScreenWorkflow\.create\(/);
  assert.match(
    app,
    /PropertyDeskCreateActions\.create\([\s\S]*?resetPropertyForm: propertyAccountEntry\.resetPropertyForm,[\s\S]*?openAccountForProperty: propertyAccountEntry\.openAccountForProperty,[\s\S]*?openPayment,[\s\S]*?openExpense,/,
  );
  assert.match(
    app,
    /editAccount: propertyAccountEntry\.editAccount,[\s\S]*?openAccountForProperty: propertyAccountEntry\.openAccountForProperty/,
  );
  assert.match(
    app,
    /propertyAccountEntry\.attachPropertyFormEvents,[\s\S]*?propertyAccountEntry\.attachAccountFormEvents,[\s\S]*?attachLedgerEntryFormEvents/,
  );

  assert.match(
    app,
    /saveCorrection: transactionMaintenance\.saveCorrection,[\s\S]*?PropertyDeskTransactionScreenWorkflow\.create\([\s\S]*?transactionMaintenance,[\s\S]*?openPayment: ledgerEntryForms\.openPayment/,
  );
});
