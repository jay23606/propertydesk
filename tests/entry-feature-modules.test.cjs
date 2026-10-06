const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("app root delegates ledger and record-entry composition to one workflow", () => {
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");

  assert.match(app, /PropertyDeskLedgerWorkflow\.create\(/);
  assert.match(app, /PropertyDeskReportExport\.create\(/);
  assert.match(app, /registerShell: window\.PropertyDeskPwa\.registerShell/);
  assert.doesNotMatch(app, /registerShell: \(\) =>/);
  assert.ok(
    app.indexOf("PropertyDeskAppShellWorkflow.create(") <
      app.indexOf("PropertyDeskLedgerWorkflow.create("),
  );
  assert.doesNotMatch(
    app,
    /PropertyDesk(?:TransactionCorrections|RecordEntryWorkflow|TransactionWorkflow)\.create\(/,
  );
  assert.match(app, /attachAccountFormEvents,/);
  assert.match(app, /attachDepositEvents,/);
  const workflow = fs.readFileSync(
    path.join(__dirname, "..", "features", "record-entry-workflow.js"),
    "utf8",
  );
  for (const feature of [
    "PropertyForm",
    "AccountForm",
    "LedgerEntryForms",
    "CreateActions",
  ]) {
    assert.match(workflow, new RegExp(`PropertyDesk${feature}\\.create\\(`));
  }
  const ledgerWorkflow = fs.readFileSync(
    path.join(__dirname, "..", "features", "ledger-workflow.js"),
    "utf8",
  );
  const creationOrder = [
    "PropertyDeskTransactionCorrections.create(",
    "PropertyDeskRecordEntryWorkflow.create(",
    "PropertyDeskTransactionWorkflow.create(",
    "PropertyDeskTransactionMaintenanceWorkflow.create(",
  ].map((marker) => ledgerWorkflow.indexOf(marker));
  assert.ok(creationOrder.every((position) => position >= 0));
  assert.deepEqual(
    creationOrder,
    [...creationOrder].sort((left, right) => left - right),
  );
  assert.match(ledgerWorkflow, /saveCorrection/);
  assert.match(ledgerWorkflow, /openPayment: entries\.openPayment/);
  assert.match(ledgerWorkflow, /openExpense: entries\.openExpense/);
});

test("app coordinator passes the amortization helper into account details", () => {
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  assert.match(
    app,
    /amortizationSchedule,[\s\S]*?\} = window\.PropertyDeskLedgerUtils;/,
  );
  assert.match(
    app,
    /PropertyDeskAccountDetailsWorkflow\.create\(\{[\s\S]*?amortizationSchedule/,
  );
  assert.doesNotMatch(
    app,
    /PropertyDesk(?:AccountDetails|AccountHistoryDetails|AccountDetailEvents|DepositDetails|DepositDetailEvents)\.create/,
  );
  assert.match(app, /PropertyDeskPropertyWorkspaceWorkflow\.create\(/);
  assert.doesNotMatch(
    app,
    /PropertyDesk(?:PropertyDetails|Overview|PropertyPortfolio)Workflow\.create/,
  );
  assert.doesNotMatch(
    app,
    /attachPropertyViewEvents|attachPropertyActionEvents/,
  );
  assert.doesNotMatch(app, /attachPropertyDetailEvents/);
  assert.match(app, /attachPropertyDocumentEvents,/);
  assert.doesNotMatch(
    app,
    /PropertyDeskProperty(?:DetailActions|Document)Workflow\.create\(/,
  );
  assert.doesNotMatch(
    app,
    /PropertyDesk(?:PropertyDetailEvents|PropertyDetailDocumentEvents|Documents|DocumentRepository|PropertyQuickNote|PropertyManagement)\.create/,
  );
  assert.match(app, /window\.PropertyDeskLedgerWorkflow\.create\(/);
  assert.doesNotMatch(
    app,
    /window\.PropertyDeskTransaction(?:Views|MaintenanceWorkflow)\.create\(/,
  );
  assert.doesNotMatch(app, /window\.PropertyDeskAccountMaintenance\.create\(/);
  assert.doesNotMatch(app, /window\.PropertyDeskDepositWorkflow\.create\(/);
  assert.match(app, /window\.PropertyDeskAccountDetailsWorkflow\.create\(/);
  assert.doesNotMatch(app, /PropertyDeskRecordMaintenance/);
  for (const filename of ["payment-entry-form.js", "expense-entry-form.js"]) {
    const source = fs.readFileSync(
      path.join(__dirname, "..", "features", filename),
      "utf8",
    );
    assert.doesNotMatch(source, /pd_correct_transaction/);
  }
  assert.doesNotMatch(
    app,
    /PropertyDeskTransaction(?:ViewEvents|CorrectionForm)\.create/,
  );
  assert.doesNotMatch(
    app,
    /PropertyDesk(?:TransactionCorrections|RecordEntryWorkflow|TransactionWorkflow)\.create/,
  );
  assert.doesNotMatch(
    app,
    /PropertyDesk(?:Deposit|Transaction)Maintenance\.create/,
  );
});

test("app coordinator creates cross-linked property views after their actions", () => {
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  const propertyWorkflow = fs.readFileSync(
    path.join(__dirname, "..", "features", "property-workspace-workflow.js"),
    "utf8",
  );
  const order = [
    "PropertyDeskPropertyDetailsWorkflow.create(",
    "PropertyDeskOverviewWorkflow.create(",
    "PropertyDeskPropertyPortfolioWorkflow.create(",
  ].map((marker) => propertyWorkflow.indexOf(marker));

  assert.ok(order.every((position) => position >= 0));
  assert.deepEqual(
    order,
    [...order].sort((left, right) => left - right),
  );
  assert.doesNotMatch(
    app,
    /\.\.\.args\) => open(?:PropertyDetails|PropertyPayment|Payment|Expense)\(/,
  );
  assert.ok(
    app.indexOf("PropertyDeskAccountDetailsWorkflow.create(") <
      app.indexOf("PropertyDeskPropertyWorkspaceWorkflow.create("),
  );
});

test("account details delegates account and deposit actions to separate workflows", () => {
  const created = [];
  const passed = {};
  const depositSectionHTML = () => "deposit html";
  let depositAttached = 0;
  const context = vm.createContext({
    window: {
      PropertyDeskDepositDetailsWorkflow: {
        create: (options) => {
          created.push("deposit details workflow");
          passed.depositWorkflow = options;
          return {
            depositSectionHTML,
            attachEvents: () => depositAttached++,
          };
        },
      },
      PropertyDeskAccountMaintenanceWorkflow: {
        create: (options) => {
          created.push("account maintenance workflow");
          passed.accountMaintenance = options;
          return { attachEvents: () => {} };
        },
      },
      PropertyDeskAccountDetailsView: {
        create: (options) => {
          created.push("account view");
          passed.view = options;
          return { renderAccountDetails: () => "account html" };
        },
      },
      PropertyDeskAccountLoanScheduleView: {
        create: (options) => {
          created.push("schedule view");
          passed.scheduleView = options;
          return { accountLoanScheduleHTML: () => "schedule html" };
        },
      },
      PropertyDeskAccountHistoryDetails: {
        create: () => {
          created.push("history");
          return { renderAccountHistory: () => "history html" };
        },
      },
      PropertyDeskAccountDetails: {
        create: (options) => {
          created.push("account details");
          passed.accountDetails = options;
          return { openAccountDetails: () => "opened" };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "account-details-workflow.js"),
      "utf8",
    ),
    context,
  );
  const dependencies = {
    $() {},
    state: {},
    money: () => 0,
    fmtDate: () => "",
    moneyInput: Number,
    depositLedger: () => [],
    esc: String,
    toast() {},
    fetchAll() {},
    prettyType: String,
    paymentFrequencyLabel: () => "monthly",
    closeModal() {},
    todayIso() {},
  };
  const workflow =
    context.window.PropertyDeskAccountDetailsWorkflow.create(dependencies);

  assert.deepEqual(created, [
    "deposit details workflow",
    "account maintenance workflow",
    "schedule view",
    "account view",
    "history",
    "account details",
  ]);
  assert.equal(passed.accountDetails.renderAccountDetails(), "account html");
  assert.equal(passed.view.money, dependencies.money);
  assert.equal(passed.scheduleView.money, dependencies.money);
  assert.equal(passed.view.accountLoanScheduleHTML instanceof Function, true);
  assert.equal(passed.accountMaintenance.closeModal, dependencies.closeModal);
  assert.equal(passed.accountMaintenance.editAccount, dependencies.editAccount);
  assert.equal(passed.accountMaintenance.openPayment, dependencies.openPayment);
  assert.equal(passed.accountDetails.depositSectionHTML, depositSectionHTML);
  assert.equal(
    passed.depositWorkflow.depositLedger,
    dependencies.depositLedger,
  );
  assert.equal(passed.depositWorkflow.moneyInput, dependencies.moneyInput);
  assert.deepEqual(Object.keys(workflow).sort(), [
    "attachDepositEvents",
    "attachEvents",
    "openAccountDetails",
  ]);
  assert.equal(workflow.openAccountDetails(), "opened");
  workflow.attachEvents();
  workflow.attachDepositEvents();
  assert.equal(depositAttached, 1);
});

test("reminder workflow composes the activity view and email preview", () => {
  const passed = {};
  const reminderActivity = () => "activity";
  const context = vm.createContext({
    window: {
      PropertyDeskReminderActivityView: {
        create: () => ({ renderReminderActivity: reminderActivity }),
      },
      PropertyDeskReminderPreview: {
        create: (options) => {
          passed.preview = options;
          return { previewReminderEmail: () => "preview" };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "reminder-workflow.js"),
      "utf8",
    ),
    context,
  );
  const openModal = () => {};
  const workflow = context.window.PropertyDeskReminderWorkflow.create({
    openModal,
  });

  assert.equal(passed.preview.openModal, openModal);
  assert.equal(workflow.renderReminderActivity, reminderActivity);
  assert.equal(workflow.previewReminderEmail(), "preview");
});

test("app coordinator delegates shared setup to the app services workflow", () => {
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  assert.match(app, /PropertyDeskAppServices\.create\(/);
  assert.match(app, /PropertyDeskLedgerContext\.create\(/);
  assert.doesNotMatch(
    app,
    /PropertyDesk(?:WorkspaceData|BackendClient|AppState|Notifications|WorkspaceRefresh)\.create/,
  );
});
