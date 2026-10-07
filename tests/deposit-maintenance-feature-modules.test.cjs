const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { loadRepositoryWriteFeedback } = require("./feature-test-helpers.cjs");

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
  loadRepositoryWriteFeedback(context);
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "repository-query-utils.js"),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "deposit-repository.js"),
      "utf8",
    ),
    context,
  );
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

test("deposit maintenance only proceeds with a ready audited adjustment", async () => {
  const context = vm.createContext({ window: {} });
  loadRepositoryWriteFeedback(context);
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "deposit-maintenance.js"),
      "utf8",
    ),
    context,
  );
  const outcomes = [
    { status: "cancelled" },
    { status: "missing-reason" },
    { status: "invalid-amount" },
  ];
  const messages = [];
  let inserts = 0;
  const maintenance = context.window.PropertyDeskDepositMaintenance.create({
    state: {
      workspaceOwnerId: "workspace-1",
      accounts: [{ id: "rental-1", account_type: "rental" }],
    },
    todayIso: () => "2026-10-04",
    toast: (message) => messages.push(message),
    fetchAll: async () => assert.fail("rejected adjustments must not refresh"),
    prepareAdjustment: () => outcomes.shift(),
    repository: {
      insert: async () => {
        inserts++;
        return { error: null };
      },
    },
  });

  assert.equal(
    await maintenance.saveDepositAdjustment(
      "rental-1",
      "retained",
      25,
      "Reason",
    ),
    false,
  );
  assert.equal(
    await maintenance.saveDepositAdjustment(
      "rental-1",
      "retained",
      25,
      "Reason",
    ),
    false,
  );
  assert.equal(
    await maintenance.saveDepositAdjustment(
      "rental-1",
      "retained",
      25,
      "Reason",
    ),
    false,
  );
  assert.equal(inserts, 0);
  assert.deepEqual(messages, [
    "Enter a reason so this adjustment can be audited",
  ]);
});

test("deposit maintenance reports a rejected save without refreshing as if it succeeded", async () => {
  const context = vm.createContext({ window: {} });
  loadRepositoryWriteFeedback(context);
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "repository-query-utils.js"),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "deposit-repository.js"),
      "utf8",
    ),
    context,
  );
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
