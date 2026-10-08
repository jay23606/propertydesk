const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("transaction records connect maintenance, entry, view, and row actions", () => {
  const passed = {};
  const saveCorrection = () => {};
  const openPayment = () => {};
  const openExpense = () => {};
  const updatePaymentGuidance = () => {};
  const attachLedgerEntryFormEvents = () => {};
  const renderPayments = () => {};
  const attachTransactionFilterEvents = () => {};
  const attachTransactionActionEvents = () => {};
  const expenseAccountPolicy = {};
  const writeFeedback = {};
  const selectRecordWriteCompletion = () => {};
  const entryWorkflows = {
    paymentView: {},
    expenseView: {},
    propertyPaymentAction: {},
  };
  const maintenance = {
    saveCorrection,
    createTransactionActionHandlers(options) {
      passed.actions = options;
      return { attachTransactionActionEvents };
    },
  };
  const entries = {
    $: () => {},
    state: {},
    moneyInput: () => {},
    todayIso: () => {},
    toast: () => {},
    closeModal: () => {},
    fetchAll: () => {},
    fillSelect: () => {},
    populateFormOptions: () => {},
    prettyType: () => {},
    openModal: () => {},
    transactionRepository: {},
    transactionPayloads: {},
    expenseAccountPolicy,
    writeFeedback,
    selectRecordWriteCompletion,
    workflows: entryWorkflows,
    unusedEntryDependency: true,
  };
  const views = {
    $: () => {},
    state: {},
    dateOnly: () => {},
    fmtDate: () => {},
    esc: () => {},
    expenseCategoryLabel: () => {},
    money: () => {},
    postedOnOrAfter: () => {},
    monthStart: () => {},
    sumIncome: () => {},
    sumOperatingExpenses: () => {},
    unusedViewDependency: true,
  };
  const workflows = {
    entryForms: { create: null },
    views: { create: null, modules: { rowView: {} } },
  };
  const context = vm.createContext({
    window: {},
  });
  workflows.entryForms = {
    create(options) {
      passed.entries = options;
      return {
        openPayment,
        openPropertyPayment() {},
        openExpense,
        updatePaymentGuidance,
        attachLedgerEntryFormEvents,
      };
    },
  };
  workflows.views = {
    modules: { rowView: {} },
    create(options) {
      passed.views = options;
      return { renderPayments, attachTransactionFilterEvents };
    },
  };
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "transaction-records-workflow.js"),
      "utf8",
    ),
    context,
  );

  const workflow = context.window.PropertyDeskTransactionRecordsWorkflow.create(
    {
      maintenance,
      entries,
      views,
      workflows,
    },
  );

  assert.equal(Object.isFrozen(workflow), true);
  for (const [key, value] of Object.entries(entries)) {
    if (key === "unusedEntryDependency") continue;
    assert.equal(passed.entries[key], value);
  }
  assert.equal(passed.entries.saveCorrection, saveCorrection);
  assert.equal("unusedEntryDependency" in passed.entries, false);
  assert.deepEqual(Object.keys(passed.entries).sort(), [
    "$",
    "closeModal",
    "expenseAccountPolicy",
    "fetchAll",
    "fillSelect",
    "moneyInput",
    "openModal",
    "populateFormOptions",
    "prettyType",
    "saveCorrection",
    "selectRecordWriteCompletion",
    "state",
    "toast",
    "todayIso",
    "transactionPayloads",
    "transactionRepository",
    "workflows",
    "writeFeedback",
  ]);
  assert.equal(passed.entries.expenseAccountPolicy, expenseAccountPolicy);
  assert.equal(passed.entries.workflows, entryWorkflows);
  for (const [key, value] of Object.entries(views)) {
    if (key === "unusedViewDependency") continue;
    assert.equal(passed.views[key], value);
  }
  assert.equal("unusedViewDependency" in passed.views, false);
  assert.deepEqual(
    Object.keys(passed.views).sort(),
    [
      "$",
      "dateOnly",
      "esc",
      "expenseCategoryLabel",
      "fmtDate",
      "money",
      "monthStart",
      "modules",
      "postedOnOrAfter",
      "state",
      "sumIncome",
      "sumOperatingExpenses",
    ].sort(),
  );
  assert.equal(passed.views.modules, workflows.views.modules);
  assert.equal(passed.actions.openPayment, openPayment);
  assert.equal(passed.actions.openExpense, openExpense);
  assert.equal(passed.actions.updatePaymentGuidance, updatePaymentGuidance);
  assert.deepEqual(Object.keys(passed.actions).sort(), [
    "openExpense",
    "openPayment",
    "updatePaymentGuidance",
  ]);
  assert.deepEqual(Object.keys(workflow).sort(), [
    "attachLedgerEntryFormEvents",
    "attachTransactionActionEvents",
    "attachTransactionFilterEvents",
    "openExpense",
    "openPayment",
    "openPropertyPayment",
    "renderPayments",
  ]);
  assert.equal(
    workflow.attachLedgerEntryFormEvents,
    attachLedgerEntryFormEvents,
  );
  assert.equal(
    workflow.attachTransactionActionEvents,
    attachTransactionActionEvents,
  );
  assert.equal(
    workflow.attachTransactionFilterEvents,
    attachTransactionFilterEvents,
  );
  assert.equal(workflow.openPayment, openPayment);
  assert.equal(workflow.openExpense, openExpense);
  assert.equal(workflow.renderPayments, renderPayments);
});
