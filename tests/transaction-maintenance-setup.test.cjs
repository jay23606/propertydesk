const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "..");

test("transaction maintenance setup scopes every child dependency", () => {
  const received = {};
  const api = { saveCorrection() {}, createTransactionActionHandlers() {} };
  const maintenanceWorkflow = {
    create(options) {
      received.options = options;
      return api;
    },
  };
  const context = vm.createContext({
    window: { PropertyDeskTransactionMaintenanceWorkflow: {} },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(root, "features/transaction-maintenance-setup.js"),
      "utf8",
    ),
    context,
  );

  const recordNames = [
    "getAccounts",
    "getPayments",
    "getExpenses",
    "getPendingCorrection",
    "setPendingCorrection",
  ];
  const uiNames = [
    "$",
    "toast",
    "closeModal",
    "prettyType",
    "promptAction",
    "confirmAction",
    "transactionTimestamp",
    "EventClass",
    "OptionClass",
    "documentRef",
  ];
  const serviceNames = [
    "fetchAll",
    "runAndRefreshWorkspaceChange",
    "transactionRepository",
  ];
  const workflowNames = [
    "maintenance",
    "correctionModel",
    "correction",
    "correctionModules",
    "voidModel",
    "voidMaintenance",
    "voidEntry",
    "maintenanceEvents",
  ];
  const makeGroup = (names) =>
    Object.fromEntries(names.map((name) => [name, { name }]));
  const records = { ...makeGroup(recordNames), unusedRecord: true };
  const ui = { ...makeGroup(uiNames), unusedUi: true };
  const services = {
    ...makeGroup(serviceNames),
    transactionRepository: { correct() {}, voidPosted() {}, unusedWrite() {} },
    unusedService: true,
  };
  const workflows = {
    ...makeGroup(workflowNames),
    maintenance: maintenanceWorkflow,
    unusedWorkflow: true,
  };
  const result = context.window.PropertyDeskTransactionMaintenanceSetup.create({
    records,
    ui,
    services,
    workflows,
  });
  const { options } = received;

  assert.equal(result, api);
  assert.deepEqual(Object.keys(options.correction).sort(), [
    "$",
    "EventClass",
    "OptionClass",
    "closeModal",
    "fetchAll",
    "getAccounts",
    "getExpenses",
    "getPayments",
    "getPendingCorrection",
    "prettyType",
    "promptAction",
    "repository",
    "runAndRefreshWorkspaceChange",
    "setPendingCorrection",
    "toast",
  ]);
  assert.deepEqual(Object.keys(options.voiding).sort(), [
    "buildVoidPayload",
    "confirmAction",
    "fetchAll",
    "getExpenses",
    "getPayments",
    "promptAction",
    "repository",
    "resolveVoidTarget",
    "runAndRefreshWorkspaceChange",
    "timestamp",
    "toast",
  ]);
  assert.deepEqual(Object.keys(options.events), ["documentRef"]);
  assert.deepEqual(Object.keys(options.workflows).sort(), [
    "correction",
    "correctionModel",
    "correctionModules",
    "events",
    "voidEntry",
    "voidMaintenance",
  ]);
  assert.deepEqual(Object.keys(options.correction.repository), ["correct"]);
  assert.deepEqual(Object.keys(options.voiding.repository), ["voidPosted"]);
  assert.deepEqual(
    options.correction.repository.correct,
    services.transactionRepository.correct,
  );
  assert.deepEqual(
    options.voiding.repository.voidPosted,
    services.transactionRepository.voidPosted,
  );
});

test("transaction maintenance setup loads before workspace setup and is precached", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const script = "features/transaction-maintenance-setup.js";
  assert.ok(
    html.indexOf(script) <
      html.indexOf("features/transaction-workspace-setup.js"),
  );
  assert.ok(html.indexOf(script) < html.indexOf("app.js"));
  assert.ok(worker.includes(`'./${script}'`));
});
