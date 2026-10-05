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
      PropertyDeskPropertyAccountForms: {
        create: () => ({
          resetPropertyForm, resetAccountForm, editAccount: () => {},
          attachEvents: (callback) => calls.push(["property forms", callback]),
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
  workflow.attachPropertyFormEvents(preview);
  workflow.attachLedgerEntryFormEvents();
  workflow.attachCreateActions(navigate);
  assert.deepEqual(calls, [
    ["property forms", preview], ["ledger forms"], ["create actions", navigate],
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
  assert.match(app, /PropertyDeskPropertyActionsWorkflow\.create\(/);
  assert.doesNotMatch(app, /PropertyDesk(?:PropertyDetailEvents|Documents|PropertyQuickNote|PropertyManagement)\.create/);
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
  assert.doesNotMatch(app, /PropertyDesk(?:TransactionCorrections|PropertyAccountForms|LedgerEntryForms|CreateActions)\.create/);
  assert.doesNotMatch(app, /PropertyDesk(?:Account|Deposit|Transaction)Maintenance\.create/);
});

test("app coordinator creates cross-linked property views after their actions", () => {
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  const order = [
    "PropertyDeskEntryWorkflow.create(",
    "PropertyDeskAccountDetailsWorkflow.create(",
    "PropertyDeskPropertyDetailsWorkflow.create(",
    "PropertyDeskPropertyActionsWorkflow.create(",
    "PropertyDeskOverviewWorkflow.create(",
    "PropertyDeskPropertyPortfolioWorkflow.create(",
  ].map((marker) => app.indexOf(marker));

  assert.ok(order.every((position) => position >= 0));
  assert.deepEqual(order, [...order].sort((left, right) => left - right));
  assert.doesNotMatch(app, /\.\.\.args\) => open(?:PropertyDetails|PropertyPayment|Payment|Expense)\(/);
});

test("account details workflow composes account, history, deposit, and passed maintenance actions", () => {
  const created = [];
  const passed = {};
  const context = vm.createContext({
    window: {
      PropertyDeskDepositDetails: { create: () => { created.push("deposit"); return { depositSectionHTML: () => "deposit html" }; } },
      PropertyDeskAccountHistoryDetails: { create: () => { created.push("history"); return { renderAccountHistory: () => "history html" }; } },
      PropertyDeskAccountDetails: { create: () => { created.push("account details"); return { openAccountDetails: () => "opened" }; } },
      PropertyDeskAccountDetailEvents: {
        create: (options) => {
          created.push("account events");
          passed.accountEvents = options;
          return { attachEvents: () => "account events attached" };
        },
      },
      PropertyDeskDepositDetailEvents: {
        create: (options) => {
          created.push("deposit events");
          passed.depositEvents = options;
          return { attachEvents: () => "deposit events attached" };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", "account-details-workflow.js"), "utf8"),
    context,
  );
  const dependencies = {
    $() {}, state: {}, closeModal() {}, closeAccount() {}, recordDepositAdjustment() {},
  };
  const workflow = context.window.PropertyDeskAccountDetailsWorkflow.create(dependencies);

  assert.deepEqual(created, ["deposit", "history", "account details", "account events", "deposit events"]);
  assert.equal(passed.accountEvents.closeAccount, dependencies.closeAccount);
  assert.equal(passed.depositEvents.recordDepositAdjustment, dependencies.recordDepositAdjustment);
  assert.equal(workflow.openAccountDetails(), "opened");
  assert.equal(workflow.attachAccountDetailEvents(), "account events attached");
  assert.equal(workflow.attachDepositDetailEvents(), "deposit events attached");
});

test("workspace settings workflow shares reminder activity with settings and preview", () => {
  const passed = {};
  const reminderActivity = () => "activity";
  const context = vm.createContext({
    window: {
      PropertyDeskReminderActivityView: {
        create: () => ({ renderReminderActivity: reminderActivity }),
      },
      PropertyDeskWorkspace: {
        create: (options) => {
          passed.workspace = options;
          return {
            renderWorkspaceSettings: () => "settings",
            attachEvents: () => "settings events",
          };
        },
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
    fs.readFileSync(path.join(__dirname, "..", "features", "workspace-settings-workflow.js"), "utf8"),
    context,
  );
  const openModal = () => {};
  const workflow = context.window.PropertyDeskWorkspaceSettingsWorkflow.create({ openModal });

  assert.equal(passed.workspace.renderReminderActivity, reminderActivity);
  assert.equal(passed.preview.openModal, openModal);
  assert.equal(workflow.renderWorkspaceSettings(), "settings");
  assert.equal(workflow.attachWorkspaceEvents(), "settings events");
  assert.equal(workflow.previewReminderEmail(), "preview");
});

test("app coordinator delegates shared setup to the app services workflow", () => {
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  assert.match(app, /PropertyDeskAppServices\.create\(/);
  assert.doesNotMatch(app, /PropertyDesk(?:WorkspaceData|BackendClient|AppState|Notifications|WorkspaceRefresh|LedgerContext)\.create/);
});
