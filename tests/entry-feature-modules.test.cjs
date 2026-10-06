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
    /PropertyDesk(?:TransactionCorrections|RecordEntryWorkflow)\.create\(/,
  );
  assert.match(app, /attachAccountFormEvents,/);
  assert.match(app, /attachDepositEvents,/);
  assert.match(app, /PropertyDeskDepositDetailsWorkflow\.create\(/);
  assert.match(app, /PropertyDeskAccountDetailActionsWorkflow\.create\(/);
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
    "PropertyDeskTransactionViews.create(",
  ].map((marker) => ledgerWorkflow.indexOf(marker));
  assert.ok(creationOrder.every((position) => position >= 0));
  assert.deepEqual(
    creationOrder,
    [...creationOrder].sort((left, right) => left - right),
  );
  assert.match(ledgerWorkflow, /saveCorrection/);
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
  assert.match(app, /PropertyDeskOverviewWorkflow\.create\(/);
  assert.match(app, /PropertyDeskPropertyPortfolioWorkflow\.create\(/);
  assert.match(app, /PropertyDeskPropertyDetailsWorkflow\.create\(/);
  assert.doesNotMatch(
    app,
    /attachPropertyViewEvents|attachPropertyActionEvents/,
  );
  assert.match(app, /attachPropertyDetailEvents: attachPropertyDetailsEvents/);
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
  assert.match(
    app,
    /window\.PropertyDeskTransactionMaintenanceWorkflow\.create\(/,
  );
  assert.doesNotMatch(app, /window\.PropertyDeskAccountMaintenance\.create\(/);
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
    /PropertyDesk(?:TransactionCorrections|RecordEntryWorkflow)\.create/,
  );
  assert.doesNotMatch(
    app,
    /PropertyDesk(?:Deposit|Transaction)Maintenance\.create/,
  );
});

test("app coordinator creates cross-linked property views after their actions", () => {
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  const detailPosition = app.indexOf(
    "PropertyDeskPropertyDetailsWorkflow.create(",
  );
  const overviewPosition = app.indexOf("PropertyDeskOverviewWorkflow.create(");
  const portfolioPosition = app.indexOf(
    "PropertyDeskPropertyPortfolioWorkflow.create(",
  );

  assert.ok(detailPosition >= 0);
  assert.ok(detailPosition < overviewPosition);
  assert.ok(overviewPosition < portfolioPosition);
  const overviewWiring = app.slice(overviewPosition, portfolioPosition);
  const portfolioWiring = app.slice(portfolioPosition);
  assert.match(overviewWiring, /openPropertyDetails,/);
  assert.match(portfolioWiring, /openPropertyDetails,/);
  assert.doesNotMatch(
    app,
    /\.\.\.args\) => open(?:PropertyDetails|PropertyPayment|Payment|Expense)\(/,
  );
  assert.ok(
    app.indexOf("PropertyDeskAccountDetailsWorkflow.create(") <
      app.indexOf("PropertyDeskPropertyDetailsWorkflow.create("),
  );
  assert.ok(
    app.indexOf("PropertyDeskPropertyDetailsWorkflow.create(") <
      app.indexOf("PropertyDeskOverviewWorkflow.create("),
  );
});

test("account detail content consumes the separate deposit renderer", () => {
  const created = [];
  const passed = {};
  const depositSectionHTML = () => "deposit html";
  const context = vm.createContext({
    window: {
      PropertyDeskAccountDetailContentWorkflow: {
        create: (options) => {
          created.push("account detail content workflow");
          passed.accountContent = options;
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
    depositSectionHTML,
    esc: String,
    prettyType: String,
    paymentFrequencyLabel: () => "monthly",
    todayIso() {},
  };
  const workflow =
    context.window.PropertyDeskAccountDetailsWorkflow.create(dependencies);

  assert.deepEqual(created, ["account detail content workflow"]);
  assert.equal(passed.accountContent.money, dependencies.money);
  assert.equal(
    passed.accountContent.depositSectionHTML,
    dependencies.depositSectionHTML,
  );
  assert.deepEqual(Object.keys(workflow).sort(), ["openAccountDetails"]);
  assert.equal(workflow.openAccountDetails(), "opened");
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
