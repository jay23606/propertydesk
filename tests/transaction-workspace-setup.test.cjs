const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "..");

test("transaction workspace setup forwards scoped dependencies to its workflow", () => {
  const window = {};
  vm.runInNewContext(
    fs.readFileSync(
      path.join(root, "features/transaction-workspace-setup.js"),
      "utf8",
    ),
    { window },
  );

  const records = Object.fromEntries(
    [
      "getProperties",
      "getAccounts",
      "getPayments",
      "getExpenses",
      "getWorkspaceOwnerId",
      "getPendingCorrection",
      "setPendingCorrection",
    ].map((name) => [name, () => name]),
  );
  const ui = Object.fromEntries(
    [
      "$",
      "toast",
      "closeModal",
      "openModal",
      "promptAction",
      "confirmAction",
      "transactionTimestamp",
      "moneyInput",
      "todayIso",
      "fillSelect",
      "populateFormOptions",
      "prettyType",
      "dateOnly",
      "now",
      "fmtDate",
      "esc",
      "expenseCategoryLabel",
      "money",
      "monthStart",
      "documentRef",
    ].map((name) => [name, { name }]),
  );
  ui.EventClass = class {};
  ui.OptionClass = class {};
  const services = Object.fromEntries(
    [
      "fetchAll",
      "transactionRepository",
      "runAndRefreshWorkspaceChange",
      "saveWorkspaceRecord",
      "saveAndRefreshWorkspaceRecord",
      "selectRecordWriteCompletion",
      "postedOnOrAfter",
      "sumIncome",
      "sumOperatingExpenses",
    ].map((name) => [name, { name }]),
  );
  const workflows = Object.fromEntries(
    [
      "correctionModel",
      "maintenance",
      "correction",
      "correctionModules",
      "voidModel",
      "voidMaintenance",
      "voidEntry",
      "maintenanceEvents",
      "ledger",
      "entryForms",
      "views",
      "transactionPayloads",
      "expenseAccountPolicy",
      "paymentView",
      "expenseView",
      "propertyPaymentAction",
    ].map((name) => [name, { name }]),
  );
  const result = { attachEvents() {} };
  let received;
  workflows.workspace = {
    create(options) {
      received = options;
      return result;
    },
  };

  assert.equal(
    window.PropertyDeskTransactionWorkspaceSetup.create({
      records,
      ui,
      services,
      workflows,
    }),
    result,
  );
  assert.deepEqual(Object.keys(received).sort(), [
    "records",
    "services",
    "ui",
    "workflows",
  ]);
  for (const [group, source] of Object.entries({ records, ui, services })) {
    for (const [name, value] of Object.entries(source)) {
      assert.equal(
        received[group][name],
        value,
        `${group}.${name} is preserved`,
      );
    }
  }
  for (const [name, value] of Object.entries(workflows)) {
    if (name !== "workspace") {
      assert.equal(
        received.workflows[name],
        value,
        `workflows.${name} is preserved`,
      );
    }
  }

  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const setupScript = "features/transaction-workspace-setup.js";
  assert.ok(
    html.indexOf("features/transaction-workspace-workflow.js") <
      html.indexOf(setupScript),
  );
  assert.ok(html.indexOf(setupScript) < html.indexOf("app.js"));
  assert.ok(worker.includes(`'./${setupScript}'`));
});
