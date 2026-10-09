const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("transaction workspace composes maintenance and ledger flows from scoped dependencies", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "features",
        "transaction-workspace-workflow.js",
      ),
      "utf8",
    ),
    context,
  );

  const calls = [];
  const records = {
    getProperties: () => [],
    getAccounts: () => [],
    getPayments: () => [],
    getExpenses: () => [],
    getWorkspaceOwnerId: () => "owner-1",
    getPendingCorrection: () => null,
    setPendingCorrection() {},
    unusedRecord: true,
  };
  const ui = {
    $() {},
    toast() {},
    closeModal() {},
    openModal() {},
    promptAction() {},
    confirmAction() {},
    EventClass: class {},
    OptionClass: class {},
    transactionTimestamp() {},
    moneyInput() {},
    todayIso() {},
    fillSelect() {},
    populateFormOptions() {},
    prettyType() {},
    dateOnly() {},
    now() {},
    fmtDate() {},
    esc() {},
    expenseCategoryLabel() {},
    money() {},
    monthStart() {},
    documentRef: {},
    unusedUi: true,
  };
  const services = {
    fetchAll() {},
    transactionRepository: {
      correct() {},
      voidPosted() {},
      insertPayment() {},
      insertExpense() {},
      unusedMaintenanceOperation() {},
    },
    runAndRefreshWorkspaceChange() {},
    saveWorkspaceRecord() {},
    saveAndRefreshWorkspaceRecord() {},
    selectRecordWriteCompletion() {},
    postedOnOrAfter() {},
    sumIncome() {},
    sumOperatingExpenses() {},
    unusedService: true,
  };
  const ledger = { name: "ledger-workflow" };
  const saveCorrection = () => {};
  const createTransactionActionHandlers = () => {};
  const maintenance = {
    saveCorrection,
    createTransactionActionHandlers,
  };
  const receivedMaintenance = {};
  const workflows = {
    maintenance: {
      correctionModel: {
        create() {
          throw new Error("correction model belongs to maintenance workflow");
        },
      },
      workflow: {
        create(received) {
          calls.push(["maintenance"]);
          Object.assign(receivedMaintenance, received);
          return maintenance;
        },
      },
      correction: {},
      correctionModules: {},
      voidModel: { resolveVoidTarget() {}, buildVoidPayload() {} },
      voidMaintenance: {},
      voidEntry: {},
      events: {},
      unusedMaintenanceWorkflow: {},
    },
    ledger: {
      workflow: {
        create(received) {
          calls.push(["ledger", received]);
          return ledger;
        },
      },
      entryForms: { create() {}, modules: {} },
      views: { create() {}, modules: {} },
      transactionPayloads: {},
      expenseAccountPolicy: {},
      paymentView: {},
      expenseView: {},
      propertyPaymentAction: {},
      unusedLedgerWorkflow: {},
    },
  };

  const result = context.window.PropertyDeskTransactionWorkspaceWorkflow.create(
    {
      records,
      ui,
      services,
      workflows,
    },
  );

  assert.equal(result, ledger);
  assert.equal(calls[0][0], "maintenance");
  assert.equal("records" in receivedMaintenance, false);
  assert.equal("unusedRecord" in receivedMaintenance.correction, false);
  assert.equal("unusedUi" in receivedMaintenance.correction, false);
  assert.equal("unusedService" in receivedMaintenance.correction, false);
  assert.equal("unusedUi" in receivedMaintenance.events, false);
  assert.equal(
    "unusedMaintenanceWorkflow" in receivedMaintenance.workflows,
    false,
  );
  assert.equal(receivedMaintenance.correction.getAccounts, records.getAccounts);
  assert.equal(receivedMaintenance.correction.getPayments, records.getPayments);
  assert.equal(receivedMaintenance.correction.getExpenses, records.getExpenses);
  assert.equal(
    receivedMaintenance.correction.getPendingCorrection,
    records.getPendingCorrection,
  );
  assert.deepEqual(Object.keys(receivedMaintenance.correction.repository), [
    "correct",
  ]);
  assert.equal(
    receivedMaintenance.correction.repository.correct,
    services.transactionRepository.correct,
  );
  assert.equal(receivedMaintenance.voiding.getExpenses, records.getExpenses);
  assert.equal("unusedRecord" in receivedMaintenance.voiding, false);
  assert.equal("unusedUi" in receivedMaintenance.voiding, false);
  assert.equal("unusedService" in receivedMaintenance.voiding, false);
  assert.deepEqual(Object.keys(receivedMaintenance.voiding.repository), [
    "voidPosted",
  ]);
  assert.equal(
    receivedMaintenance.voiding.repository.voidPosted,
    services.transactionRepository.voidPosted,
  );
  assert.equal(
    receivedMaintenance.workflows.correctionModel,
    workflows.maintenance.correctionModel,
  );
  assert.equal(calls[1][0], "ledger");
  assert.equal(calls[1][1].saveCorrection, saveCorrection);
  assert.equal(
    calls[1][1].createTransactionActionHandlers,
    createTransactionActionHandlers,
  );
  assert.equal(
    calls[1][1].entries.getWorkspaceOwnerId,
    records.getWorkspaceOwnerId,
  );
  assert.equal(calls[1][1].views.getProperties, records.getProperties);
  assert.equal("unusedRecord" in calls[1][1].entries, false);
  assert.equal("unusedUi" in calls[1][1].entries, false);
  assert.equal("unusedService" in calls[1][1].entries, false);
  assert.equal("unusedRecord" in calls[1][1].views, false);
  assert.equal("unusedUi" in calls[1][1].views, false);
  assert.equal("unusedService" in calls[1][1].views, false);
  assert.equal("unusedLedgerWorkflow" in calls[1][1].workflows, false);
  assert.deepEqual(
    Object.keys(calls[1][1].entries.transactionRepository).sort(),
    ["insertExpense", "insertPayment"],
  );
  assert.equal(
    calls[1][1].entries.transactionRepository.insertPayment,
    services.transactionRepository.insertPayment,
  );
  assert.equal(
    calls[1][1].entries.transactionRepository.insertExpense,
    services.transactionRepository.insertExpense,
  );
  assert.doesNotMatch(
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "features",
        "transaction-workspace-workflow.js",
      ),
      "utf8",
    ),
    /\bstate\b/,
  );
});
