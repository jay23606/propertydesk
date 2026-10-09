const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("import workspace supplies configured validators to the import feature", () => {
  const calls = [];
  const validators = { validators: true };
  const feature = { feature: true };
  const state = {};
  const validationWorkflowNames = [
    "csvValueUtils",
    "accountImportTerms",
    "paymentImportAllocation",
    "validationApi",
  ];
  const validationModuleNames = [
    "currencyUtils",
    "domainOptions",
    "displayUtils",
    "accountValidation",
    "importRows",
    "accountImportIdentity",
    "emailAddresses",
    "expenseValidation",
    "transactionOptions",
    "expenseAccountPolicy",
    "paymentValidation",
  ];
  const workflows = Object.fromEntries(
    [...validationWorkflowNames, "feature"].map((name) => [name, { name }]),
  );
  const modules = Object.fromEntries(
    [...validationModuleNames, "csvParser"].map((name) => [name, { name }]),
  );
  const dependencies = {
    $() {},
    getWorkspaceOwnerId: () => state.workspaceOwnerId,
    getImportBatches: () => state.importBatches,
    getAccounts: () => state.accounts,
    getPayments: () => state.payments,
    getExpenses: () => state.expenses,
    getProperties: () => state.properties,
    getPendingImport: () => state.pendingImport,
    setPendingImport: (value) => {
      state.pendingImport = value;
    },
    esc() {},
    openModal() {},
    closeModal() {},
    todayIso() {},
    fetchAll() {},
    toast() {},
    repository: {},
    refreshWorkspace() {},
    workflows: {
      ...workflows,
      feature: {
        create(options) {
          calls.push(["feature", options]);
          return feature;
        },
      },
    },
    validationWorkflow: {
      create(options) {
        calls.push(["validation", options]);
        return { validators };
      },
    },
    modules,
  };
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "import-workspace-workflow.js"),
      "utf8",
    ),
    context,
  );

  const result =
    context.window.PropertyDeskImportWorkspaceWorkflow.create(dependencies);

  assert.equal(result, feature);
  assert.deepEqual(
    calls.map(([name]) => name),
    ["validation", "feature"],
  );
  assert.deepEqual(
    Object.keys(calls[0][1].workflows).sort(),
    validationWorkflowNames.sort(),
  );
  assert.deepEqual(
    Object.keys(calls[0][1].modules).sort(),
    validationModuleNames.sort(),
  );
  assert.equal("feature" in calls[0][1].workflows, false);
  assert.equal("csvParser" in calls[0][1].modules, false);
  assert.equal(calls[0][1].modules.currencyUtils, modules.currencyUtils);
  assert.equal(calls[1][1].modules.validators, validators);
  assert.equal(calls[1][1].modules.csvParser, modules.csvParser);
  assert.equal(calls[1][1].repository, dependencies.repository);
  assert.equal(calls[1][1].refreshWorkspace, dependencies.refreshWorkspace);
  assert.equal(calls[1][1].getAccounts, dependencies.getAccounts);
  assert.equal(calls[1][1].getPendingImport, dependencies.getPendingImport);
  assert.equal(calls[1][1].setPendingImport, dependencies.setPendingImport);
  assert.equal("state" in calls[1][1], false);
});
