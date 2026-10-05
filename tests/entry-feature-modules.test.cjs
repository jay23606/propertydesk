const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("entry workflow shares correction saving across forms and create actions", () => {
  const passed = {};
  const correction = () => {};
  const resetPropertyForm = () => {};
  const resetAccountForm = () => {};
  const openPayment = () => {};
  const openExpense = () => {};
  const preview = () => {};
  const navigate = () => {};
  const calls = [];
  const context = vm.createContext({
    window: {
      PropertyDeskTransactionCorrections: {
        create: () => ({ saveCorrection: correction }),
      },
      PropertyDeskAccountPayload: { build: () => ({}) },
      PropertyDeskAccountFormModel: {},
      PropertyDeskPropertyForm: {
        create: () => ({
          resetPropertyForm,
          attachEvents: () => calls.push(["property form events"]),
        }),
      },
      PropertyDeskAccountForm: {
        create: () => ({
          resetAccountForm,
          editAccount: () => {},
          attachEvents: (callback) => calls.push(["account form events", callback]),
        }),
      },
      PropertyDeskLedgerEntryForms: {
        create: (options) => {
          passed.ledger = options;
          return {
            updateAllocationPreview: () => {}, openPayment, openPropertyPayment: () => {},
            openExpense,
            attachEvents: () => calls.push(["ledger forms"]),
          };
        },
      },
      PropertyDeskCreateActions: {
        create: (options) => {
          passed.actions = options;
          return { attachEvents: (callback) => calls.push(["create actions", callback]) };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", "entry-workflow.js"), "utf8"),
    context,
  );
  const workflow = context.window.PropertyDeskEntryWorkflow.create({ documentRef: {} });

  assert.equal(passed.ledger.saveCorrection, correction);
  assert.equal(passed.actions.resetPropertyForm, resetPropertyForm);
  assert.equal(passed.actions.resetAccountForm, resetAccountForm);
  assert.equal(passed.actions.openPayment, openPayment);
  assert.equal(passed.actions.openExpense, openExpense);
  workflow.attachPropertyFormEvents();
  workflow.attachAccountFormEvents(preview);
  workflow.attachLedgerEntryFormEvents();
  workflow.attachCreateActions(navigate);
  assert.deepEqual(calls, [
    ["property form events"], ["account form events", preview],
    ["ledger forms"], ["create actions", navigate],
  ]);
});

test("app coordinator passes the amortization helper into account details", () => {
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  assert.match(
    app,
    /amortizationSchedule,[\s\S]*?\} = window\.PropertyDeskLedgerUtils;/,
  );
  assert.match(app, /PropertyDeskAccountDetailsWorkflow\.create\(\{[\s\S]*?amortizationSchedule/);
  assert.doesNotMatch(app, /PropertyDesk(?:AccountDetails|AccountHistoryDetails|AccountDetailEvents|DepositDetails|DepositDetailEvents)\.create/);
  assert.match(app, /PropertyDeskOverviewWorkflow\.create\(/);
  assert.doesNotMatch(app, /PropertyDeskOverview(?:Events)?\.create/);
  assert.match(app, /PropertyDeskPropertyPortfolioWorkflow\.create\(/);
  assert.doesNotMatch(app, /PropertyDeskProperty(?:PortfolioTable|PortfolioModel|Views|ViewEvents)\.create/);
  assert.match(app, /PropertyDeskPropertyDetailActionsWorkflow\.create\(/);
  assert.doesNotMatch(app, /\(\) => attachPropertyDetailEvents\(/);
  assert.match(app, /PropertyDeskPropertyDocumentWorkflow\.create\(/);
  assert.doesNotMatch(app, /PropertyDesk(?:PropertyDetailEvents|PropertyDetailDocumentEvents|Documents|DocumentRepository|PropertyQuickNote|PropertyManagement)\.create/);
  assert.match(app, /window\.PropertyDeskTransactionWorkflow\.create\(\{[\s\S]*?fetchAll/);
  assert.match(app, /window\.PropertyDeskTransactionMaintenanceWorkflow\.create\(/);
  assert.match(app, /window\.PropertyDeskAccountMaintenanceWorkflow\.create\(/);
  assert.doesNotMatch(app, /PropertyDeskRecordMaintenance/);
  assert.match(app, /window\.PropertyDeskEntryWorkflow\.create\(/);
  for (const filename of ["payment-entry-form.js", "expense-entry-form.js"]) {
    const source = fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8");
    assert.doesNotMatch(source, /pd_correct_transaction/);
  }
  assert.doesNotMatch(app, /PropertyDeskTransaction(?:Views|ViewEvents|CorrectionForm)\.create/);
  assert.doesNotMatch(app, /PropertyDesk(?:TransactionCorrections|PropertyForm|AccountForm|LedgerEntryForms|CreateActions)\.create/);
  assert.doesNotMatch(app, /PropertyDesk(?:Account|Deposit|Transaction)Maintenance\.create/);
});

test("app coordinator creates cross-linked property views after their actions", () => {
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  const order = [
    "PropertyDeskEntryWorkflow.create(",
    "PropertyDeskAccountDetailsWorkflow.create(",
    "PropertyDeskPropertyDetailsWorkflow.create(",
    "PropertyDeskPropertyDetailActionsWorkflow.create(",
    "PropertyDeskPropertyDocumentWorkflow.create(",
    "PropertyDeskOverviewWorkflow.create(",
    "PropertyDeskPropertyPortfolioWorkflow.create(",
  ].map((marker) => app.indexOf(marker));

  assert.ok(order.every((position) => position >= 0));
  assert.deepEqual(order, [...order].sort((left, right) => left - right));
  assert.doesNotMatch(app, /\.\.\.args\) => open(?:PropertyDetails|PropertyPayment|Payment|Expense)\(/);
});

test("account details workflow composes account, history, and account actions", () => {
  const created = [];
  const passed = {};
  const context = vm.createContext({
    window: {
      PropertyDeskAccountDetailsView: {
        create: (options) => {
          created.push("account view");
          passed.view = options;
          return { renderAccountDetails: () => "account html" };
        },
      },
      PropertyDeskAccountHistoryDetails: { create: () => { created.push("history"); return { renderAccountHistory: () => "history html" }; } },
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
          return { attachEvents: () => "account events attached" };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", "account-details-workflow.js"), "utf8"),
    context,
  );
  const dependencies = {
    $() {}, state: {}, money: () => 0, fmtDate: () => "", esc: String,
    prettyType: String, paymentFrequencyLabel: () => "monthly",
    closeModal() {}, closeAccount() {}, depositSectionHTML: () => "deposit html",
  };
  const workflow = context.window.PropertyDeskAccountDetailsWorkflow.create(dependencies);

  assert.deepEqual(created, ["account view", "history", "account details", "account events"]);
  assert.equal(passed.accountDetails.renderAccountDetails(), "account html");
  assert.equal(passed.view.money, dependencies.money);
  assert.equal(passed.accountEvents.closeAccount, dependencies.closeAccount);
  assert.equal(passed.accountDetails.depositSectionHTML, dependencies.depositSectionHTML);
  assert.equal(workflow.openAccountDetails(), "opened");
  assert.equal(workflow.attachAccountDetailEvents(), "account events attached");
});

test("deposit details workflow composes ledger rendering with adjustment actions", () => {
  const passed = {};
  const depositSectionHTML = () => "deposit html";
  const recordDepositAdjustment = () => "adjusted";
  const attachEvents = () => "deposit events attached";
  const context = vm.createContext({
    window: {
      PropertyDeskDepositMaintenance: {
        create: (options) => {
          passed.maintenance = options;
          return { recordDepositAdjustment };
        },
      },
      PropertyDeskDepositDetails: {
        create: (options) => {
          passed.details = options;
          return { depositSectionHTML };
        },
      },
      PropertyDeskDepositDetailEvents: {
        create: (options) => {
          passed.events = options;
          return { attachEvents };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", "deposit-details-workflow.js"), "utf8"),
    context,
  );
  const dependencies = {
    $() {}, state: {}, depositLedger() {}, money() {}, fmtDate() {}, esc() {},
    moneyInput() {}, todayIso() {}, toast() {}, fetchAll() {},
  };
  const workflow = context.window.PropertyDeskDepositDetailsWorkflow.create(dependencies);

  assert.equal(passed.details.state, dependencies.state);
  assert.equal(passed.maintenance.moneyInput, dependencies.moneyInput);
  assert.equal(passed.maintenance.fetchAll, dependencies.fetchAll);
  assert.equal(passed.events.recordDepositAdjustment, recordDepositAdjustment);
  assert.equal(passed.events.depositSectionHTML, depositSectionHTML);
  assert.equal(workflow.depositSectionHTML, depositSectionHTML);
  assert.equal(workflow.attachDepositDetailEvents(), "deposit events attached");
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
    fs.readFileSync(path.join(__dirname, "..", "features", "reminder-workflow.js"), "utf8"),
    context,
  );
  const openModal = () => {};
  const workflow = context.window.PropertyDeskReminderWorkflow.create({ openModal });

  assert.equal(passed.preview.openModal, openModal);
  assert.equal(workflow.renderReminderActivity, reminderActivity);
  assert.equal(workflow.previewReminderEmail(), "preview");
});

test("workspace settings workflow receives reminder activity without owning preview", () => {
  const passed = {};
  const reminderActivity = () => "activity";
  const context = vm.createContext({
    window: {
      PropertyDeskWorkspace: {
        create: (options) => {
          passed.workspace = options;
          return {
            renderWorkspaceSettings: () => "settings",
            attachEvents: () => "settings events",
          };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", "workspace-settings-workflow.js"), "utf8"),
    context,
  );
  const workflow = context.window.PropertyDeskWorkspaceSettingsWorkflow.create({
    $() {}, state: {}, esc() {}, toast() {}, fetchAll() {}, updateGreeting() {},
    renderReminderActivity: reminderActivity,
  });

  assert.equal(passed.workspace.renderReminderActivity, reminderActivity);
  assert.equal(workflow.renderWorkspaceSettings(), "settings");
  assert.equal(workflow.attachWorkspaceEvents(), "settings events");
  assert.equal("previewReminderEmail" in workflow, false);
});

test("app coordinator delegates shared setup to the app services workflow", () => {
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  assert.match(app, /PropertyDeskAppServices\.create\(/);
  assert.doesNotMatch(app, /PropertyDesk(?:WorkspaceData|BackendClient|AppState|Notifications|WorkspaceRefresh|LedgerContext)\.create/);
});
