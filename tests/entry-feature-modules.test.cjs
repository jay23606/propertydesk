const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("app root delegates record-entry composition to its workflow", () => {
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");

  assert.match(app, /PropertyDeskTransactionCorrections\.create\(/);
  assert.match(
    app,
    /PropertyDeskRecordEntryWorkflow\.create\(\{[\s\S]*?saveCorrection/,
  );
  assert.match(app, /attachAccountFormEvents\(previewReminderEmail\)/);
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
  assert.doesNotMatch(
    app,
    /attachPropertyDetailEvents|attachPropertyDocumentEvents/,
  );
  assert.doesNotMatch(
    app,
    /PropertyDeskProperty(?:DetailActions|Document)Workflow\.create\(/,
  );
  assert.doesNotMatch(
    app,
    /PropertyDesk(?:PropertyDetailEvents|PropertyDetailDocumentEvents|Documents|DocumentRepository|PropertyQuickNote|PropertyManagement)\.create/,
  );
  assert.match(app, /window\.PropertyDeskTransactionWorkflow\.create\(/);
  assert.doesNotMatch(
    app,
    /window\.PropertyDeskTransaction(?:Views|MaintenanceWorkflow)\.create\(/,
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
  assert.match(app, /PropertyDeskTransactionCorrections\.create/);
  assert.match(app, /PropertyDeskRecordEntryWorkflow\.create/);
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

test("account details workflow composes account details, history, and account maintenance", () => {
  const created = [];
  const passed = {};
  const closeAccount = () => "closed";
  const depositSectionHTML = () => "deposit html";
  let depositAttached = 0;
  const context = vm.createContext({
    window: {
      PropertyDeskAccountMaintenance: {
        create: (options) => {
          created.push("account maintenance");
          passed.accountMaintenance = options;
          return { closeAccount };
        },
      },
      PropertyDeskAccountDetailsView: {
        create: (options) => {
          created.push("account view");
          passed.view = options;
          return { renderAccountDetails: () => "account html" };
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
      PropertyDeskAccountDetailEvents: {
        create: (options) => {
          created.push("account events");
          passed.accountEvents = options;
          return {
            attachEvents: () => {},
          };
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
    esc: String,
    toast() {},
    fetchAll() {},
    depositSectionHTML,
    attachDepositEvents: () => depositAttached++,
    prettyType: String,
    paymentFrequencyLabel: () => "monthly",
    closeModal() {},
    todayIso() {},
  };
  const workflow =
    context.window.PropertyDeskAccountDetailsWorkflow.create(dependencies);

  assert.deepEqual(created, [
    "account maintenance",
    "account view",
    "history",
    "account details",
    "account events",
  ]);
  assert.equal(passed.accountDetails.renderAccountDetails(), "account html");
  assert.equal(passed.view.money, dependencies.money);
  assert.equal(passed.accountEvents.closeAccount, closeAccount);
  assert.equal(passed.accountEvents.closeModal, dependencies.closeModal);
  assert.equal(passed.accountDetails.depositSectionHTML, depositSectionHTML);
  assert.deepEqual(Object.keys(workflow).sort(), [
    "attachEvents",
    "openAccountDetails",
  ]);
  assert.equal(workflow.openAccountDetails(), "opened");
  workflow.attachEvents();
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
  assert.doesNotMatch(
    app,
    /PropertyDesk(?:WorkspaceData|BackendClient|AppState|Notifications|WorkspaceRefresh|LedgerContext)\.create/,
  );
});
