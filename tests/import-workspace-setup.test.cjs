const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("import workspace setup maps scoped records, UI, services, and modules", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "features", "import-workspace-setup.js"),
    "utf8",
  );
  const context = vm.createContext({ window: {} });
  vm.runInContext(source, context);

  let received;
  const result = { attachPreviewEvents() {} };
  const imports = {
    create(options) {
      received = options;
      return result;
    },
  };
  const records = Object.fromEntries(
    [
      "getWorkspaceOwnerId",
      "getImportBatches",
      "getAccounts",
      "getPayments",
      "getExpenses",
      "getProperties",
      "getPendingImport",
      "setPendingImport",
    ].map((key) => [key, () => key]),
  );
  const ui = Object.fromEntries(
    ["$", "esc", "openModal", "closeModal", "todayIso", "toast"].map((key) => [
      key,
      () => key,
    ]),
  );
  const services = {
    fetchAll: () => "fetchAll",
    repository: { key: "repository" },
    refreshWorkspace: () => "refreshWorkspace",
  };
  const workflows = Object.fromEntries(
    [
      "csvValueUtils",
      "accountImportTerms",
      "paymentImportAllocation",
      "validationApi",
      "feature",
      "validation",
      "modules",
    ].map((key) => [key, { key }]),
  );
  workflows.imports = imports;

  assert.equal(
    context.window.PropertyDeskImportWorkspaceSetup.create({
      records,
      ui,
      services,
      workflows,
    }),
    result,
  );
  assert.deepEqual(
    Object.keys(received.records).sort(),
    Object.keys(records).sort(),
  );
  assert.deepEqual(Object.keys(received.ui).sort(), [
    "$",
    "closeModal",
    "esc",
    "openModal",
    "toast",
    "todayIso",
  ]);
  assert.deepEqual(Object.keys(received.services).sort(), [
    "fetchAll",
    "refreshWorkspace",
    "repository",
  ]);
  for (const key of Object.keys(received.records))
    assert.equal(received.records[key], records[key]);
  for (const key of Object.keys(received.ui))
    assert.equal(received.ui[key], ui[key]);
  for (const key of Object.keys(received.services))
    assert.equal(received.services[key], services[key]);
  assert.equal(received.validationWorkflow, workflows.validation);
  assert.equal(received.modules, workflows.modules);
  assert.doesNotMatch(source, /\bstate\b/);
});
