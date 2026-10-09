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
  };
  const services = {
    fetchAll() {},
    transactionRepository: {},
    runAndRefreshWorkspaceChange() {},
    saveWorkspaceRecord() {},
    saveAndRefreshWorkspaceRecord() {},
    selectRecordWriteCompletion() {},
    postedOnOrAfter() {},
    sumIncome() {},
    sumOperatingExpenses() {},
  };
  const ledger = { name: "ledger-workflow" };
  const maintenance = { name: "maintenance" };
  const receivedMaintenance = {};
  const workflows = {
    correctionModel: {
      create() {
        throw new Error("correction model belongs to maintenance workflow");
      },
    },
    maintenance: {
      create(received) {
        calls.push(["maintenance"]);
        Object.assign(receivedMaintenance, received);
        return maintenance;
      },
    },
    ledger: {
      create(received) {
        calls.push(["ledger", received]);
        return ledger;
      },
    },
    correction: {},
    correctionModules: {},
    voidModel: { resolveVoidTarget() {}, buildVoidPayload() {} },
    voidMaintenance: {},
    voidEntry: {},
    maintenanceEvents: {},
    entryForms: { create() {}, modules: {} },
    views: { create() {}, modules: {} },
    transactionPayloads: {},
    expenseAccountPolicy: {},
    paymentView: {},
    expenseView: {},
    propertyPaymentAction: {},
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
  assert.equal(receivedMaintenance.records.getPayments, records.getPayments);
  assert.equal(receivedMaintenance.records.getExpenses, records.getExpenses);
  assert.equal(receivedMaintenance.records.getAccounts, records.getAccounts);
  assert.equal(
    receivedMaintenance.correction.getPendingCorrection,
    records.getPendingCorrection,
  );
  assert.equal(
    receivedMaintenance.correction.repository,
    services.transactionRepository,
  );
  assert.equal(receivedMaintenance.voiding.getExpenses, records.getExpenses);
  assert.equal(
    receivedMaintenance.workflows.correctionModel,
    workflows.correctionModel,
  );
  assert.equal(calls[1][0], "ledger");
  assert.equal(calls[1][1].maintenance, maintenance);
  assert.equal(
    calls[1][1].entries.getWorkspaceOwnerId,
    records.getWorkspaceOwnerId,
  );
  assert.equal(calls[1][1].views.getProperties, records.getProperties);
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
