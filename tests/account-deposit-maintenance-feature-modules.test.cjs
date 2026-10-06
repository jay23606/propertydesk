const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("account details workflow composes detail, history, and deposit actions", () => {
  const created = [];
  const passed = {};
  const methods = {
    attachAccountDetailActionEvents() {},
    attachDepositEvents() {},
    depositSectionHTML() {},
    openAccountDetails() {},
    renderAccountHistory() {},
  };
  const factories = {
    PropertyDeskDepositDetailsWorkflow: {
      create: (context) => {
        created.push("deposit details");
        passed.depositDetails = context;
        return { depositSectionHTML: methods.depositSectionHTML };
      },
    },
    PropertyDeskDepositMaintenanceWorkflow: {
      create: (context) => {
        created.push("deposit maintenance");
        passed.depositMaintenance = context;
        return { attachEvents: methods.attachDepositEvents };
      },
    },
    PropertyDeskAccountDetailActionsWorkflow: {
      create: (context) => {
        created.push("account actions");
        passed.accountActions = context;
        return { attachEvents: methods.attachAccountDetailActionEvents };
      },
    },
    PropertyDeskAccountHistoryDetails: {
      create: (context) => {
        created.push("account history");
        passed.accountHistory = context;
        return { renderAccountHistory: methods.renderAccountHistory };
      },
    },
    PropertyDeskAccountDetailContentWorkflow: {
      create: (context) => {
        created.push("account content");
        passed.accountContent = context;
        return { openAccountDetails: methods.openAccountDetails };
      },
    },
  };
  const context = vm.createContext({ window: factories });
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
    toast() {},
    fetchAll() {},
    money() {},
    moneyInput() {},
    todayIso() {},
    depositLedger() {},
    fmtDate() {},
    esc() {},
    closeModal() {},
    editAccount() {},
    openPayment() {},
    sumPosted() {},
    prettyType() {},
    paymentFrequencyLabel() {},
    accountBalance() {},
    amortizationSchedule() {},
    amountDueSince() {},
    unpaidDueAccrualStart() {},
    openModal() {},
    propertyAddress() {},
  };
  const workflow =
    context.window.PropertyDeskAccountDetailsWorkflow.create(dependencies);

  assert.deepEqual(created, [
    "deposit details",
    "deposit maintenance",
    "account actions",
    "account history",
    "account content",
  ]);
  assert.equal(passed.depositDetails.state, dependencies.state);
  assert.equal(
    passed.depositMaintenance.depositSectionHTML,
    methods.depositSectionHTML,
  );
  assert.equal(passed.accountHistory.state, dependencies.state);
  assert.equal(
    passed.accountContent.renderAccountHistory,
    methods.renderAccountHistory,
  );
  assert.equal(passed.accountContent.sumPosted, dependencies.sumPosted);
  assert.equal(
    passed.accountContent.depositSectionHTML,
    methods.depositSectionHTML,
  );
  assert.equal(
    workflow.attachAccountDetailActionEvents,
    methods.attachAccountDetailActionEvents,
  );
  assert.equal(workflow.attachDepositEvents, methods.attachDepositEvents);
  assert.equal(workflow.depositSectionHTML, undefined);
  assert.equal(workflow.openAccountDetails, methods.openAccountDetails);
});

test("deposit details workflow composes ledger data and rendering", () => {
  const passed = {};
  const depositSectionHTML = () => "deposit HTML";
  const context = vm.createContext({
    window: {
      PropertyDeskDepositDetails: {
        create: (options) => {
          passed.view = options;
          return { depositSectionHTML };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "deposit-details-workflow.js"),
      "utf8",
    ),
    context,
  );
  const dependencies = {
    state: {},
    depositLedger() {},
    money() {},
    fmtDate() {},
    esc() {},
  };
  const workflow =
    context.window.PropertyDeskDepositDetailsWorkflow.create(dependencies);

  assert.equal(passed.view.depositLedger, dependencies.depositLedger);
  assert.equal(workflow.depositSectionHTML, depositSectionHTML);
  assert.deepEqual(Object.keys(workflow), ["depositSectionHTML"]);
});

test("deposit maintenance workflow composes adjustments with detail events", () => {
  const passed = {};
  const depositSectionHTML = () => "deposit HTML";
  const recordDepositAdjustment = () => "adjusted";
  let attached = 0;
  const context = vm.createContext({
    window: {
      PropertyDeskDepositMaintenance: {
        create: (options) => {
          passed.maintenance = options;
          return { saveDepositAdjustment: recordDepositAdjustment };
        },
      },
      PropertyDeskDepositAdjustmentEntry: {
        create: (options) => {
          passed.entry = options;
          return { recordDepositAdjustment };
        },
      },
      PropertyDeskDepositDetailEvents: {
        create: (options) => {
          passed.events = options;
          return { attachEvents: () => attached++ };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "deposit-maintenance-workflow.js"),
      "utf8",
    ),
    context,
  );
  const dependencies = {
    $() {},
    state: {},
    moneyInput() {},
    todayIso() {},
    toast() {},
    fetchAll() {},
    depositSectionHTML,
  };
  const workflow =
    context.window.PropertyDeskDepositMaintenanceWorkflow.create(dependencies);

  assert.equal(passed.maintenance.state, dependencies.state);
  assert.equal(passed.maintenance.moneyInput, undefined);
  assert.equal(passed.entry.state, dependencies.state);
  assert.equal(passed.entry.moneyInput, dependencies.moneyInput);
  assert.equal(passed.entry.saveDepositAdjustment, recordDepositAdjustment);
  assert.equal(passed.events.depositSectionHTML, depositSectionHTML);
  assert.equal(passed.events.recordDepositAdjustment, recordDepositAdjustment);
  assert.deepEqual(Object.keys(workflow), ["attachEvents"]);
  workflow.attachEvents();
  assert.equal(attached, 1);
});

test("account detail actions workflow composes account closure with edit and payment routing", () => {
  const passed = {};
  const closeAccount = () => "closed";
  const saveCloseAccount = () => "saved";
  let attached = 0;
  const modalCloses = [];
  const context = vm.createContext({
    window: {
      PropertyDeskAccountMaintenance: {
        create: (options) => {
          passed.maintenance = options;
          return { saveCloseAccount };
        },
      },
      PropertyDeskAccountCloseEntry: {
        create: (options) => {
          passed.entry = options;
          return { closeAccount };
        },
      },
      PropertyDeskAccountDetailEvents: {
        create: (options) => {
          passed.events = options;
          return { attachEvents: () => attached++ };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "features",
        "account-detail-actions-workflow.js",
      ),
      "utf8",
    ),
    context,
  );
  const dependencies = {
    $: (id) => ({ id }),
    state: {},
    toast() {},
    fetchAll() {},
    closeModal: (modal) => modalCloses.push(modal.id),
    editAccount() {},
    openPayment() {},
  };
  const workflow =
    context.window.PropertyDeskAccountDetailActionsWorkflow.create(
      dependencies,
    );

  assert.equal(passed.maintenance.state, dependencies.state);
  assert.equal(passed.maintenance.fetchAll, dependencies.fetchAll);
  assert.equal(typeof passed.maintenance.closeAccountDetails, "function");
  assert.equal(passed.maintenance.$, undefined);
  passed.maintenance.closeAccountDetails();
  assert.deepEqual(modalCloses, ["detail-modal"]);
  assert.equal(passed.entry.saveCloseAccount, saveCloseAccount);
  assert.equal(passed.events.closeAccount, closeAccount);
  assert.equal(passed.events.editAccount, dependencies.editAccount);
  assert.equal(passed.events.openPayment, dependencies.openPayment);
  assert.deepEqual(Object.keys(workflow), ["attachEvents"]);
  workflow.attachEvents();
  assert.equal(attached, 1);
});

test("account detail content workflow composes schedule and selected account", () => {
  const passed = {};
  const accountLoanScheduleHTML = () => "schedule";
  const renderAccountDetails = () => "details";
  const renderAccountHistory = () => "history";
  const openAccountDetails = () => "opened";
  const context = vm.createContext({
    window: {
      PropertyDeskAccountLoanScheduleView: {
        create: (options) => {
          passed.schedule = options;
          return { accountLoanScheduleHTML };
        },
      },
      PropertyDeskAccountDetailsView: {
        create: (options) => {
          passed.view = options;
          return { renderAccountDetails };
        },
      },
      PropertyDeskAccountDetailsModel: {
        create: (options) => {
          passed.model = options;
          return { buildAccountDetailData: () => ({}) };
        },
      },
      PropertyDeskAccountFinancialSummary: {
        create: (options) => {
          passed.financialSummary = options;
          return { summarizeAccount: () => ({}) };
        },
      },
      PropertyDeskAccountDetails: {
        create: (options) => {
          passed.details = options;
          return { openAccountDetails };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "features",
        "account-detail-content-workflow.js",
      ),
      "utf8",
    ),
    context,
  );
  const dependencies = {
    $() {},
    state: {},
    money() {},
    fmtDate() {},
    esc() {},
    sumPosted() {},
    prettyType() {},
    paymentFrequencyLabel() {},
    accountBalance() {},
    amortizationSchedule() {},
    amountDueSince() {},
    unpaidDueAccrualStart() {},
    todayIso() {},
    openModal() {},
    propertyAddress() {},
    depositSectionHTML() {},
    renderAccountHistory,
  };
  const workflow =
    context.window.PropertyDeskAccountDetailContentWorkflow.create(
      dependencies,
    );

  assert.equal(passed.view.accountLoanScheduleHTML, accountLoanScheduleHTML);
  assert.equal(passed.model.state, dependencies.state);
  assert.equal(passed.model.sumPosted, dependencies.sumPosted);
  assert.equal(
    passed.financialSummary.accountBalance,
    dependencies.accountBalance,
  );
  assert.equal(typeof passed.model.summarizeAccount, "function");
  assert.equal(passed.details.renderAccountDetails, renderAccountDetails);
  assert.equal(typeof passed.details.buildAccountDetailData, "function");
  assert.equal(
    passed.details.renderAccountHistory,
    dependencies.renderAccountHistory,
  );
  assert.equal(
    passed.details.depositSectionHTML,
    dependencies.depositSectionHTML,
  );
  assert.deepEqual(Object.keys(workflow), ["openAccountDetails"]);
  assert.equal(workflow.openAccountDetails, openAccountDetails);
});

test("account history details connect the history query and rendering", async () => {
  const passed = {};
  const accountHistoryHTML = (history) => history;
  const history = { auditError: false };
  const context = vm.createContext({
    window: {
      PropertyDeskAccountHistoryModel: {
        create: (options) => {
          passed.model = options;
          return { loadAccountHistory: async () => history };
        },
      },
      PropertyDeskAccountHistoryView: {
        create: (options) => {
          passed.view = options;
          return { accountHistoryHTML };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "account-history-details.js"),
      "utf8",
    ),
    context,
  );
  const dependencies = {
    state: {},
    esc() {},
    money() {},
    fmtDate() {},
  };
  const feature =
    context.window.PropertyDeskAccountHistoryDetails.create(dependencies);

  assert.equal(passed.model.state, dependencies.state);
  assert.equal(await feature.renderAccountHistory({}, []), history);
  assert.equal(passed.view.esc, dependencies.esc);
});

test("deposit adjustment model validates inputs and prepares audited payloads", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "deposit-adjustment-model.js"),
      "utf8",
    ),
    context,
  );
  const model = context.window.PropertyDeskDepositAdjustmentModel;
  const account = { id: "rental-1", account_type: "rental" };
  const common = {
    account,
    userId: "workspace-1",
    accountId: account.id,
    type: "retained",
    amount: 250,
    movementDate: "2026-10-04",
  };

  assert.equal(
    model.validate({ account: null, amount: 1 }).status,
    "unavailable",
  );
  assert.equal(
    model.validate({ account: { account_type: "note" }, amount: 1 }).status,
    "unavailable",
  );
  assert.equal(model.validate({ account, amount: 0 }).status, "invalid-amount");
  assert.equal(model.prepare({ ...common, reason: null }).status, "cancelled");
  assert.equal(
    model.prepare({ ...common, reason: "   " }).status,
    "missing-reason",
  );
  assert.deepEqual(
    JSON.parse(
      JSON.stringify(
        model.prepare({ ...common, reason: "  Inspection retention  " }),
      ),
    ),
    {
      status: "ready",
      payload: {
        user_id: "workspace-1",
        account_id: "rental-1",
        entry_type: "retained",
        amount: 250,
        movement_date: "2026-10-04",
        reason: "Inspection retention",
      },
    },
  );
});

test("deposit maintenance retains adjustment audit details", async () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "deposit-adjustment-model.js"),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "deposit-maintenance.js"),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "deposit-adjustment-entry.js"),
      "utf8",
    ),
    context,
  );
  const prompts = ["250.00", "Deposit retention per move-out inspection"];
  const inserts = [];
  const messages = [];
  let refreshes = 0;
  const state = {
    workspaceOwnerId: "workspace-1",
    accounts: [{ id: "rental-1", account_type: "rental" }],
    client: {
      from(table) {
        return {
          async insert(payload) {
            inserts.push([table, payload]);
            return { error: null };
          },
        };
      },
    },
  };
  const maintenance = context.window.PropertyDeskDepositMaintenance.create({
    state,
    todayIso: () => "2026-10-04",
    toast: (message) => messages.push(message),
    fetchAll: async () => {
      refreshes += 1;
    },
  });
  const entry = context.window.PropertyDeskDepositAdjustmentEntry.create({
    state,
    moneyInput: Number,
    toast: (message) => messages.push(message),
    saveDepositAdjustment: maintenance.saveDepositAdjustment,
    promptAction: () => prompts.shift(),
  });

  assert.equal(
    await entry.recordDepositAdjustment("rental-1", "retained"),
    true,
  );

  assert.equal(inserts[0][0], "pd_deposit_entries");
  assert.equal(inserts[0][1].user_id, "workspace-1");
  assert.equal(inserts[0][1].amount, 250);
  assert.equal(
    inserts[0][1].reason,
    "Deposit retention per move-out inspection",
  );
  assert.equal(messages.at(-1), "Deposit retention recorded");
  assert.equal(refreshes, 1);
});

test("deposit maintenance reports a rejected save without refreshing as if it succeeded", async () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "deposit-adjustment-model.js"),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "deposit-maintenance.js"),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "deposit-adjustment-entry.js"),
      "utf8",
    ),
    context,
  );
  const prompts = ["25.00", "Retention correction"];
  const messages = [];
  const state = {
    workspaceOwnerId: "workspace-1",
    accounts: [{ id: "rental-1", account_type: "rental" }],
    client: {
      from: () => ({
        insert: async () => {
          throw new Error("offline");
        },
      }),
    },
  };
  const maintenance = context.window.PropertyDeskDepositMaintenance.create({
    state,
    todayIso: () => "2026-10-04",
    toast: (message) => messages.push(message),
    fetchAll: async () => assert.fail("failed save must not refresh"),
  });
  const entry = context.window.PropertyDeskDepositAdjustmentEntry.create({
    state,
    moneyInput: Number,
    toast: (message) => messages.push(message),
    saveDepositAdjustment: maintenance.saveDepositAdjustment,
    promptAction: () => prompts.shift(),
  });

  assert.equal(
    await entry.recordDepositAdjustment("rental-1", "retained"),
    false,
  );
  assert.deepEqual(messages, [
    "Deposit adjustment failed. Check your connection and try again.",
  ]);
});

test("deposit adjustment entry validates the amount before asking for an audit reason", async () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "deposit-adjustment-model.js"),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "deposit-adjustment-entry.js"),
      "utf8",
    ),
    context,
  );
  const prompts = ["0"];
  const messages = [];
  const state = {
    accounts: [{ id: "rental-1", account_type: "rental" }],
  };
  const entry = context.window.PropertyDeskDepositAdjustmentEntry.create({
    state,
    moneyInput: Number,
    toast: (message) => messages.push(message),
    saveDepositAdjustment: () =>
      assert.fail("invalid amount should not reach persistence"),
    promptAction: (message) => {
      messages.push(message);
      return prompts.shift();
    },
  });

  assert.equal(
    await entry.recordDepositAdjustment("rental-1", "retained"),
    false,
  );
  assert.deepEqual(messages, [
    "Amount retained from the deposit?",
    "Enter an amount greater than zero",
  ]);
});

test("account maintenance closes an account while preserving its history", async () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "account-maintenance.js"),
      "utf8",
    ),
    context,
  );
  const updates = [];
  const calls = [];
  const messages = [];
  const state = {
    client: {
      from(table) {
        return {
          update(payload) {
            updates.push([table, payload]);
            return {
              async eq(column, value) {
                updates.push([column, value]);
                return { error: null };
              },
            };
          },
        };
      },
    },
  };
  const feature = context.window.PropertyDeskAccountMaintenance.create({
    state,
    closeAccountDetails: () => calls.push(["close-details"]),
    fetchAll: async () => calls.push("refresh"),
    toast: (message) => messages.push(message),
  });

  await feature.saveCloseAccount({ id: "account-1", name: "Rental" });

  assert.equal(updates[0][0], "pd_accounts");
  assert.equal(updates[0][1].status, "closed");
  assert.deepEqual(updates[1], ["id", "account-1"]);
  assert.deepEqual(calls, [["close-details"], "refresh"]);
  assert.equal(messages.at(-1), "Account closed");
});

test("account maintenance reports rejected requests and skips success actions", async () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "account-maintenance.js"),
      "utf8",
    ),
    context,
  );
  const calls = [];
  const messages = [];
  const feature = context.window.PropertyDeskAccountMaintenance.create({
    state: {
      client: {
        from: () => ({
          update: () => ({
            eq: async () => {
              throw new Error("offline");
            },
          }),
        }),
      },
    },
    closeAccountDetails: () => calls.push("close-details"),
    fetchAll: async () => calls.push("refresh"),
    toast: (message) => messages.push(message),
  });

  await assert.doesNotReject(
    feature.saveCloseAccount({ id: "account-1", name: "Rental" }),
  );
  assert.deepEqual(calls, []);
  assert.deepEqual(messages, [
    "Account couldn't be closed right now. Please try again.",
  ]);
});

test("account close entry confirms before delegating to persistence", async () => {
  const calls = [];
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "account-close-entry.js"),
      "utf8",
    ),
    context,
  );
  const account = { id: "account-1", name: "Rental" };
  const entry = context.window.PropertyDeskAccountCloseEntry.create({
    confirmAction: (message) => {
      calls.push(["confirm", message]);
      return true;
    },
    saveCloseAccount: (value) => calls.push(["save", value]),
  });

  await entry.closeAccount(account);

  assert.deepEqual(calls, [
    [
      "confirm",
      "Close “Rental”? Its payment history will remain in your records.",
    ],
    ["save", account],
  ]);
});

test("account close entry does not persist when confirmation is declined", () => {
  const calls = [];
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "account-close-entry.js"),
      "utf8",
    ),
    context,
  );
  const entry = context.window.PropertyDeskAccountCloseEntry.create({
    confirmAction: () => false,
    saveCloseAccount: () => calls.push("save"),
  });

  assert.equal(entry.closeAccount({ id: "account-1", name: "Rental" }), false);
  assert.deepEqual(calls, []);
});
