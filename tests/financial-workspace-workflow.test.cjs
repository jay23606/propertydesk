const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("financial workspace connects payment, transaction, and account actions", () => {
  const calls = [];
  const methods = Object.fromEntries(
    [
      "editAccount",
      "updatePaymentGuidance",
      "openPayment",
      "openPropertyPayment",
      "openExpense",
      "openAccountForProperty",
      "renderPayments",
      "attachTransactionEvents",
      "openAccountDetails",
      "attachEntryEvents",
      "attachAccountDetailsEvents",
    ].map((name) => [name, () => name]),
  );
  const context = vm.createContext({
    window: {
      PropertyDeskEntryWorkflow: {
        create: (options) => {
          calls.push(["entry", options]);
          return {
            editAccount: methods.editAccount,
            updatePaymentGuidance: methods.updatePaymentGuidance,
            openPayment: methods.openPayment,
            openPropertyPayment: methods.openPropertyPayment,
            openExpense: methods.openExpense,
            openAccountForProperty: methods.openAccountForProperty,
            attachEvents: methods.attachEntryEvents,
          };
        },
      },
      PropertyDeskTransactionWorkflow: {
        create: (options) => {
          calls.push(["transactions", options]);
          return {
            renderPayments: methods.renderPayments,
            attachEvents: methods.attachTransactionEvents,
          };
        },
      },
      PropertyDeskAccountDetailsWorkflow: {
        create: (options) => {
          calls.push(["account-details", options]);
          return {
            openAccountDetails: methods.openAccountDetails,
            attachEvents: methods.attachAccountDetailsEvents,
          };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "financial-workspace-workflow.js"),
      "utf8",
    ),
    context,
  );
  const dependencies = { state: { accounts: [] }, amortizationSchedule() {} };
  const workflow =
    context.window.PropertyDeskFinancialWorkspaceWorkflow.create(dependencies);

  assert.deepEqual(
    calls.map(([name]) => name),
    ["entry", "transactions", "account-details"],
  );
  assert.equal(calls[0][1].state, dependencies.state);
  assert.equal(calls[1][1].openPayment, methods.openPayment);
  assert.equal(calls[1][1].openExpense, methods.openExpense);
  assert.equal(
    calls[1][1].updatePaymentGuidance,
    methods.updatePaymentGuidance,
  );
  assert.equal(calls[2][1].editAccount, methods.editAccount);
  assert.equal(calls[2][1].openPayment, methods.openPayment);
  assert.equal(
    calls[2][1].amortizationSchedule,
    dependencies.amortizationSchedule,
  );
  assert.equal(workflow.editAccount, methods.editAccount);
  assert.equal(workflow.openPropertyPayment, methods.openPropertyPayment);
  assert.equal(workflow.renderPayments, methods.renderPayments);
  assert.equal(
    workflow.attachTransactionEvents,
    methods.attachTransactionEvents,
  );
  assert.equal(workflow.openAccountDetails, methods.openAccountDetails);
  assert.equal(workflow.attachEntryEvents, methods.attachEntryEvents);
  assert.equal(
    workflow.attachAccountDetailsEvents,
    methods.attachAccountDetailsEvents,
  );
});

test("financial workspace loads before app and is precached", () => {
  const root = path.join(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");

  assert.ok(
    html.indexOf("features/financial-workspace-workflow.js") <
      html.indexOf("app.js"),
  );
  for (const dependency of [
    "features/entry-workflow.js",
    "features/transaction-workflow.js",
    "features/account-details-workflow.js",
  ]) {
    assert.ok(
      html.indexOf(dependency) <
        html.indexOf("features/financial-workspace-workflow.js"),
      `${dependency} loads before the financial workspace workflow`,
    );
  }
  assert.match(worker, /'\.\/features\/financial-workspace-workflow\.js'/);
});
