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
  assert.equal(received.getWorkspaceOwnerId, records.getWorkspaceOwnerId);
  assert.equal(received.getPendingImport, records.getPendingImport);
  assert.equal(received.setPendingImport, records.setPendingImport);
  assert.equal(received.$, ui.$);
  assert.equal(received.closeModal, ui.closeModal);
  assert.equal(received.repository, services.repository);
  assert.equal(received.refreshWorkspace, services.refreshWorkspace);
  assert.equal(received.validationWorkflow, workflows.validation);
  assert.equal(received.modules, workflows.modules);
  assert.doesNotMatch(source, /\bstate\b/);
});
