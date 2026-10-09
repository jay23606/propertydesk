const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("import workspace builds validation rules before composing import actions", () => {
  const calls = [];
  const values = Object.fromEntries(
    ["csv", "terms", "allocation", "validators", "feature"].map((key) => [
      key,
      { key },
    ]),
  );
  const workflows = {
    csvValueUtils: {
      create: (options) => (calls.push(["csv", options]), values.csv),
    },
    accountImportTerms: {
      create: (options) => (calls.push(["terms", options]), values.terms),
    },
    paymentImportAllocation: {
      create: (options) => (
        calls.push(["allocation", options]),
        values.allocation
      ),
    },
    validationApi: {
      create: (options) => (
        calls.push(["validators", options]),
        values.validators
      ),
    },
    feature: {
      create: (options) => (calls.push(["feature", options]), values.feature),
    },
  };
  const moduleNames = [
    "currencyUtils",
    "displayUtils",
    "domainOptions",
    "transactionOptions",
    "expenseAccountPolicy",
    "emailAddresses",
    "accountValidation",
    "accountImportIdentity",
    "expenseValidation",
    "paymentValidation",
    "importRows",
    "csvParser",
    "preview",
    "previewEvents",
    "commit",
    "review",
    "accountImport",
    "accountImportPayload",
    "csvImportFile",
    "transactionImport",
    "paymentImport",
    "expenseImport",
    "transactionImportWorkflow",
  ];
  const modules = Object.fromEntries(moduleNames.map((key) => [key, { key }]));
  const dependencies = {
    $() {},
    state: {},
    esc() {},
    openModal() {},
    closeModal() {},
    todayIso() {},
    fetchAll() {},
    toast() {},
    repository: {},
    writeFeedback: {},
    workflows,
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

  assert.equal(result, values.feature);
  assert.deepEqual(
    calls.map(([name]) => name),
    ["csv", "terms", "allocation", "validators", "feature"],
  );
  assert.equal(calls[1][1].modules.csvValueUtils, values.csv);
  assert.equal(calls[2][1].modules.csvValueUtils, values.csv);
  assert.equal(calls[3][1].account.modules.terms, values.terms);
  assert.equal(
    calls[3][1].payment.modules.paymentAllocation,
    values.allocation,
  );
  assert.equal(calls[4][1].modules.validators, values.validators);
  assert.equal(calls[4][1].repository, dependencies.repository);
  assert.equal(calls[4][1].writeFeedback, dependencies.writeFeedback);
  assert.equal(calls[4][1].modules.csvParser, modules.csvParser);
});
