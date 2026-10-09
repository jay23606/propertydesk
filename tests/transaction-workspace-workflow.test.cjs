const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("transaction workspace receives an isolated maintenance API", () => {
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
  const maintenance = Object.freeze({
    saveCorrection() {},
    createTransactionActionHandlers() {},
  });
  let received;
  const ledger = { workflow: "ledger" };
  const result = context.window.PropertyDeskTransactionWorkspaceWorkflow.create(
    {
      records: {
        getProperties() {},
        getAccounts() {},
        getPayments() {},
        getExpenses() {},
        getWorkspaceOwnerId() {},
        getPendingCorrection() {},
        setPendingCorrection() {},
      },
      ui: {
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
      },
      services: {
        fetchAll() {},
        transactionRepository: {
          insertPayment() {},
          insertExpense() {},
        },
        saveWorkspaceRecord() {},
        saveAndRefreshWorkspaceRecord() {},
        selectRecordWriteCompletion() {},
        postedOnOrAfter() {},
        sumIncome() {},
        sumOperatingExpenses() {},
      },
      workflows: {
        maintenance,
        ledger: {
          workflow: {
            create(options) {
              received = options;
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
        },
      },
    },
  );

  assert.equal(result, ledger);
  assert.equal(received.saveCorrection, maintenance.saveCorrection);
  assert.equal(
    received.createTransactionActionHandlers,
    maintenance.createTransactionActionHandlers,
  );
  assert.deepEqual(Object.keys(received.entries.transactionRepository).sort(), [
    "insertExpense",
    "insertPayment",
  ]);
  assert.equal("correction" in received, false);
  assert.equal("voiding" in received, false);
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
    /correctionModel|voidMaintenance|resolveVoidTarget/,
  );
});
