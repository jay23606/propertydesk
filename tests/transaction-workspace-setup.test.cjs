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
  records.unusedRecordValue = true;
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
  ui.unusedUiValue = true;
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
  services.unusedServiceValue = true;
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
  assert.deepEqual(Object.keys(received.records).sort(), [
    "getAccounts",
    "getExpenses",
    "getPayments",
    "getPendingCorrection",
    "getProperties",
    "getWorkspaceOwnerId",
    "setPendingCorrection",
  ]);
  assert.deepEqual(Object.keys(received.ui).sort(), [
    "$",
    "EventClass",
    "OptionClass",
    "closeModal",
    "confirmAction",
    "dateOnly",
    "documentRef",
    "esc",
    "expenseCategoryLabel",
    "fillSelect",
    "fmtDate",
    "money",
    "moneyInput",
    "monthStart",
    "now",
    "openModal",
    "populateFormOptions",
    "prettyType",
    "promptAction",
    "toast",
    "todayIso",
    "transactionTimestamp",
  ]);
  assert.deepEqual(Object.keys(received.services).sort(), [
    "fetchAll",
    "postedOnOrAfter",
    "runAndRefreshWorkspaceChange",
    "saveAndRefreshWorkspaceRecord",
    "saveWorkspaceRecord",
    "selectRecordWriteCompletion",
    "sumIncome",
    "sumOperatingExpenses",
    "transactionRepository",
  ]);
  for (const [group, source] of Object.entries({ records, ui, services })) {
    for (const [name, value] of Object.entries(source)) {
      if (name.startsWith("unused")) {
        assert.equal(name in received[group], false);
        continue;
      }
      assert.equal(
        received[group][name],
        value,
        `${group}.${name} is preserved`,
      );
    }
  }
  for (const [name, value] of Object.entries(workflows)) {
    if (name !== "workspace") {
      const group = [
        "correctionModel",
        "maintenance",
        "correction",
        "correctionModules",
        "voidModel",
        "voidMaintenance",
        "voidEntry",
        "maintenanceEvents",
      ].includes(name)
        ? received.workflows.maintenance
        : received.workflows.ledger;
      const key =
        name === "maintenanceEvents"
          ? "events"
          : name === "maintenance" || name === "ledger"
            ? "workflow"
            : name;
      assert.equal(group[key], value, `workflows.${name} is preserved`);
    }
  }
  assert.deepEqual(Object.keys(received.workflows).sort(), [
    "ledger",
    "maintenance",
  ]);
  assert.equal("ledger" in received.workflows.maintenance, false);
  assert.equal("maintenance" in received.workflows.ledger, false);

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
