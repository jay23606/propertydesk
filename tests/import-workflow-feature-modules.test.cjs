const assert = require("node:assert/strict");
const test = require("node:test");
const { loadImportFeatures } = require("./feature-test-helpers.cjs");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("CSV import feature loads as an isolated browser module", () => {
  const validators = Object.freeze({ validateAccountRows() {} });
  const context = vm.createContext({
    window: {
      PropertyDeskImportWorkflows: validators,
      PropertyDeskImportCommit: {
        create: () => ({ commitAccounts() {}, commitTransactions() {} }),
      },
      PropertyDeskImportRepository: { create: () => ({}) },
      PropertyDeskCsvImportFile: { create: () => ({ attachEvents() {} }) },
    },
  });
  loadImportFeatures(context);

  assert.equal(context.window.PropertyDeskImportWorkflows, validators);
  const previewEvents = context.window.PropertyDeskImportPreviewEvents.create(
    {},
  );
  const handlers = new Map();
  const feature = context.window.PropertyDeskImportFeature.create({
    $: (id) => ({
      addEventListener: (event, handler) =>
        handlers.set(`${id}:${event}`, handler),
    }),
    createImportLookup() {},
  });
  assert.deepEqual(Object.keys(feature), [
    "attachPreviewEvents",
    "attachAccountEvents",
    "attachPaymentEvents",
    "attachExpenseEvents",
  ]);
  assert.equal(typeof previewEvents.attachEvents, "function");
  feature.attachPreviewEvents();
  feature.attachAccountEvents();
  feature.attachPaymentEvents();
  feature.attachExpenseEvents();
  assert.deepEqual(
    [...handlers.keys()],
    [
      "import-correction-body:change",
      "import-include-duplicates:change",
      "import-commit:click",
      "import-file:change",
      "payment-import-file:change",
      "expense-import-file:change",
    ],
  );
});

test("import workflow keeps file import handlers inside its event bindings", () => {
  const calls = [];
  const passed = {};
  const createImportLookup = () => ({});
  const accounts = { attachEvents: () => calls.push("account events") };
  const payments = { attachEvents: () => calls.push("payment events") };
  const expenses = { attachEvents: () => calls.push("expense events") };
  const context = vm.createContext({
    window: {
      PropertyDeskImportRows: {
        selectImportRows: (rows) => rows,
        createImportLookup,
      },
      PropertyDeskCsvParser: { parseCSV() {} },
      PropertyDeskImportWorkflows: {
        validateAccountRows() {},
        validatePaymentRows() {},
        validateExpenseRows() {},
      },
      PropertyDeskImportPreview: {
        create: () => {
          const stageImport = () => {};
          passed.stageImport = stageImport;
          return {
            stageImport,
            renderImportPreview() {},
            updateImportCommitButton() {},
          };
        },
      },
      PropertyDeskImportPreviewEvents: {
        create: () => ({ attachEvents() {} }),
      },
      PropertyDeskAccountImportPayload: { build() {} },
      PropertyDeskImportCommit: {
        create: (options) => {
          passed.commit = options;
          return { commitAccounts() {}, commitTransactions() {} };
        },
      },
      PropertyDeskImportRepository: {
        create: (options) => {
          passed.importRepository = options;
          return { kind: "import-repository" };
        },
      },
      PropertyDeskTransactionImportWorkflow: { create() {} },
      PropertyDeskCsvImportFile: { create: () => ({ attachEvents() {} }) },
      PropertyDeskImportReview: {
        create: (options) => {
          passed.importReviewDependencies = options;
          return { stage() {} };
        },
      },
      PropertyDeskAccountImport: {
        create: (options) => {
          passed.account = options;
          return accounts;
        },
      },
      PropertyDeskTransactionImportFeature: {
        create: (options) => {
          passed.transactions = options;
          return {
            attachPaymentEvents: payments.attachEvents,
            attachExpenseEvents: expenses.attachEvents,
          };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "imports.js"),
      "utf8",
    ),
    context,
  );
  const dependencies = {
    $() {},
    state: {},
    todayIso() {},
    fetchAll() {},
    toast() {},
    repository: { kind: "injected-import-repository" },
    unrelatedDependency() {},
  };
  const imports = context.window.PropertyDeskImportFeature.create(dependencies);

  assert.equal(Object.isFrozen(imports), true);
  assert.deepEqual(Object.keys(imports), [
    "attachPreviewEvents",
    "attachAccountEvents",
    "attachPaymentEvents",
    "attachExpenseEvents",
  ]);
  assert.equal(passed.commit.repository, dependencies.repository);
  assert.deepEqual(Object.keys(passed.commit).sort(), [
    "fetchAll",
    "repository",
    "status",
    "toast",
  ]);
  assert.equal(passed.importRepository, undefined);
  assert.deepEqual(
    Object.keys(passed.account).sort(),
    [
      "$",
      "buildPayloads",
      "commitAccounts",
      "createFileWorkflow",
      "importReview",
      "parseCSV",
      "state",
      "todayIso",
      "validateAccountRows",
    ].sort(),
  );
  assert.equal(
    passed.account.buildPayloads,
    context.window.PropertyDeskAccountImportPayload.build,
  );
  assert.deepEqual(Object.keys(passed.transactions.shared).sort(), [
    "$",
    "createFileWorkflow",
    "createImportLookup",
    "createTransactionImportWorkflow",
  ]);
  assert.deepEqual(
    Object.keys(passed.transactions.payment).sort(),
    [
      "commitTransactions",
      "importReview",
      "parseCSV",
      "state",
      "validatePaymentRows",
    ].sort(),
  );
  assert.deepEqual(
    Object.keys(passed.transactions.expense).sort(),
    [
      "commitTransactions",
      "importReview",
      "parseCSV",
      "state",
      "validateExpenseRows",
    ].sort(),
  );
  assert.equal(
    passed.account.importReview,
    passed.transactions.payment.importReview,
  );
  assert.equal(
    passed.transactions.payment.importReview,
    passed.transactions.expense.importReview,
  );
  assert.equal(
    passed.account.validateAccountRows,
    context.window.PropertyDeskImportWorkflows.validateAccountRows,
  );
  assert.deepEqual(Object.keys(passed.importReviewDependencies), [
    "stageImport",
  ]);
  assert.equal(passed.importReviewDependencies.stageImport, passed.stageImport);
  imports.attachAccountEvents();
  imports.attachPaymentEvents();
  imports.attachExpenseEvents();
  assert.deepEqual(calls, [
    "account events",
    "payment events",
    "expense events",
  ]);
});
