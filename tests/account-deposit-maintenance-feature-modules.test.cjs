const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

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
  assert.equal(passed.maintenance.moneyInput, dependencies.moneyInput);
  assert.equal(passed.events.depositSectionHTML, depositSectionHTML);
  assert.equal(passed.events.recordDepositAdjustment, recordDepositAdjustment);
  assert.deepEqual(Object.keys(workflow), ["attachEvents"]);
  workflow.attachEvents();
  assert.equal(attached, 1);
});

test("account detail actions workflow composes account closure with edit and payment routing", () => {
  const passed = {};
  const closeAccount = () => "closed";
  let attached = 0;
  const context = vm.createContext({
    window: {
      PropertyDeskAccountMaintenance: {
        create: (options) => {
          passed.maintenance = options;
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
    $() {},
    state: {},
    toast() {},
    fetchAll() {},
    closeModal() {},
    editAccount() {},
    openPayment() {},
  };
  const workflow =
    context.window.PropertyDeskAccountDetailActionsWorkflow.create(
      dependencies,
    );

  assert.equal(passed.maintenance.state, dependencies.state);
  assert.equal(passed.maintenance.fetchAll, dependencies.fetchAll);
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
    isPosted() {},
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
  assert.equal(passed.details.renderAccountDetails, renderAccountDetails);
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

test("deposit maintenance retains adjustment audit details", async () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "deposit-maintenance.js"),
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
  const feature = context.window.PropertyDeskDepositMaintenance.create({
    state,
    moneyInput: Number,
    todayIso: () => "2026-10-04",
    toast: (message) => messages.push(message),
    fetchAll: async () => {
      refreshes += 1;
    },
    confirmAction: () => true,
    promptAction: () => prompts.shift(),
  });

  assert.equal(
    await feature.recordDepositAdjustment("rental-1", "retained"),
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
      path.join(__dirname, "..", "features", "deposit-maintenance.js"),
      "utf8",
    ),
    context,
  );
  const prompts = ["25.00", "Retention correction"];
  const messages = [];
  const feature = context.window.PropertyDeskDepositMaintenance.create({
    state: {
      workspaceOwnerId: "workspace-1",
      accounts: [{ id: "rental-1", account_type: "rental" }],
      client: {
        from: () => ({
          insert: async () => {
            throw new Error("offline");
          },
        }),
      },
    },
    moneyInput: Number,
    todayIso: () => "2026-10-04",
    toast: (message) => messages.push(message),
    fetchAll: async () => assert.fail("failed save must not refresh"),
    promptAction: () => prompts.shift(),
  });

  assert.equal(
    await feature.recordDepositAdjustment("rental-1", "retained"),
    false,
  );
  assert.deepEqual(messages, [
    "Deposit adjustment failed. Check your connection and try again.",
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
    $: (id) => ({ id }),
    state,
    confirmAction: () => true,
    closeModal: (modal) => calls.push(["close", modal.id]),
    fetchAll: async () => calls.push("refresh"),
    toast: (message) => messages.push(message),
  });

  await feature.closeAccount({ id: "account-1", name: "Rental" });

  assert.equal(updates[0][0], "pd_accounts");
  assert.equal(updates[0][1].status, "closed");
  assert.deepEqual(updates[1], ["id", "account-1"]);
  assert.deepEqual(calls, [["close", "detail-modal"], "refresh"]);
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
    $: (id) => ({ id }),
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
    confirmAction: () => true,
    closeModal: () => calls.push("close"),
    fetchAll: async () => calls.push("refresh"),
    toast: (message) => messages.push(message),
  });

  await assert.doesNotReject(
    feature.closeAccount({ id: "account-1", name: "Rental" }),
  );
  assert.deepEqual(calls, []);
  assert.deepEqual(messages, [
    "Account couldn't be closed right now. Please try again.",
  ]);
});
