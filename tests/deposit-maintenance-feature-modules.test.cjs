const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { loadRepositoryWriteFeedback } = require("./feature-test-helpers.cjs");

function loadAdjustmentModel(context) {
  if (!context.window.PropertyDeskDepositAdjustmentModel) {
    vm.runInContext(
      fs.readFileSync(
        path.join(__dirname, "..", "features", "deposit-adjustment-model.js"),
        "utf8",
      ),
      context,
    );
  }
  return context.window.PropertyDeskDepositAdjustmentModel;
}

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
  assert.equal(
    model.resolveType("retained").successMessage,
    "Deposit retention recorded",
  );
  assert.equal(
    model.resolveType("restored").successMessage,
    "Deposit retention reversed",
  );
  assert.equal(model.resolveType("unknown"), null);
  assert.equal(
    model.prepare({ ...common, type: "unknown", reason: "Reason" }).status,
    "unsupported-type",
  );
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
    repository: context.window.PropertyDeskDepositRepository.create({
      getClient: () => state.client,
    }),
    prepareAdjustment:
      context.window.PropertyDeskDepositAdjustmentModel.prepare,
    resolveAdjustmentType:
      context.window.PropertyDeskDepositAdjustmentModel.resolveType,
  });
  const entry = context.window.PropertyDeskDepositAdjustmentEntry.create({
    state,
    moneyInput: Number,
    toast: (message) => messages.push(message),
    saveDepositAdjustment: maintenance.saveDepositAdjustment,
    validateAdjustment:
      context.window.PropertyDeskDepositAdjustmentModel.validate,
    resolveAdjustmentType:
      context.window.PropertyDeskDepositAdjustmentModel.resolveType,
    promptAction: () => prompts.shift(),
  });

  assert.equal(Object.isFrozen(maintenance), true);
  assert.equal(Object.isFrozen(entry), true);
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
  const adjustmentModel = loadAdjustmentModel(context);
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
    resolveAdjustmentType: adjustmentModel.resolveType,
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
  assert.equal(
    await maintenance.saveDepositAdjustment(
      "rental-1",
      "unknown",
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

test("deposit maintenance reconciles an adjustment after a lost response", async () => {
  const context = vm.createContext({ window: {} });
  const adjustmentModel = loadAdjustmentModel(context);
  loadRepositoryWriteFeedback(context);
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "deposit-maintenance.js"),
      "utf8",
    ),
    context,
  );
  const events = [];
  const state = {
    workspaceOwnerId: "workspace-1",
    accounts: [{ id: "rental-1", account_type: "rental" }],
    depositEntries: [],
  };
  const maintenance = context.window.PropertyDeskDepositMaintenance.create({
    state,
    todayIso: () => "2026-10-08",
    toast: (message) => events.push(["toast", message]),
    fetchAll: async () => {
      state.depositEntries = [
        {
          user_id: "workspace-1",
          account_id: "rental-1",
          entry_type: "retained",
          amount: 25,
          movement_date: "2026-10-08",
          reason: "Retention correction",
        },
      ];
      events.push(["refresh"]);
    },
    prepareAdjustment: () => ({
      status: "ready",
      payload: {
        user_id: "workspace-1",
        account_id: "rental-1",
        entry_type: "retained",
        amount: 25,
        movement_date: "2026-10-08",
        reason: "Retention correction",
      },
    }),
    resolveAdjustmentType: adjustmentModel.resolveType,
    repository: {
      insert: async () => {
        throw new Error("connection lost");
      },
    },
  });

  assert.equal(
    await maintenance.saveDepositAdjustment(
      "rental-1",
      "retained",
      25,
      "Retention correction",
    ),
    true,
  );
  assert.deepEqual(events, [
    ["refresh"],
    ["toast", "Deposit retention recorded"],
  ]);
});

test("deposit maintenance asks to check the refreshed ledger before retrying", async () => {
  const context = vm.createContext({ window: {} });
  const adjustmentModel = loadAdjustmentModel(context);
  loadRepositoryWriteFeedback(context);
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "deposit-maintenance.js"),
      "utf8",
    ),
    context,
  );
  const events = [];
  const maintenance = context.window.PropertyDeskDepositMaintenance.create({
    state: {
      workspaceOwnerId: "workspace-1",
      accounts: [{ id: "rental-1", account_type: "rental" }],
      depositEntries: [],
    },
    todayIso: () => "2026-10-08",
    toast: (message) => events.push(["toast", message]),
    fetchAll: async () => events.push(["refresh"]),
    prepareAdjustment: () => ({
      status: "ready",
      payload: {
        user_id: "workspace-1",
        account_id: "rental-1",
        entry_type: "retained",
        amount: 25,
        movement_date: "2026-10-08",
        reason: "Retention correction",
      },
    }),
    resolveAdjustmentType: adjustmentModel.resolveType,
    repository: {
      insert: async () => {
        throw new Error("connection lost");
      },
    },
  });

  assert.equal(
    await maintenance.saveDepositAdjustment(
      "rental-1",
      "retained",
      25,
      "Retention correction",
    ),
    false,
  );
  assert.deepEqual(events, [
    ["refresh"],
    [
      "toast",
      "Deposit ledger was refreshed. Check it before recording the adjustment again.",
    ],
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
  const adjustmentModel = loadAdjustmentModel(context);
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
    repository: context.window.PropertyDeskDepositRepository.create({
      getClient: () => ({
        from: () => ({
          insert: async () => ({ error: { message: "Denied" } }),
        }),
      }),
    }),
    prepareAdjustment:
      context.window.PropertyDeskDepositAdjustmentModel.prepare,
    resolveAdjustmentType: adjustmentModel.resolveType,
  });
  const entry = context.window.PropertyDeskDepositAdjustmentEntry.create({
    state,
    moneyInput: Number,
    toast: (message) => messages.push(message),
    saveDepositAdjustment: maintenance.saveDepositAdjustment,
    validateAdjustment:
      context.window.PropertyDeskDepositAdjustmentModel.validate,
    resolveAdjustmentType: adjustmentModel.resolveType,
    promptAction: () => prompts.shift(),
  });

  assert.equal(
    await entry.recordDepositAdjustment("rental-1", "retained"),
    false,
  );
  assert.deepEqual(messages, ["Deposit adjustment failed: Denied"]);
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
    validateAdjustment:
      context.window.PropertyDeskDepositAdjustmentModel.validate,
    resolveAdjustmentType:
      context.window.PropertyDeskDepositAdjustmentModel.resolveType,
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

test("deposit adjustment entry treats amount prompt cancellation as a no-op", async () => {
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
  const messages = [];
  let promptCount = 0;
  const entry = context.window.PropertyDeskDepositAdjustmentEntry.create({
    state: {
      accounts: [{ id: "rental-1", account_type: "rental" }],
    },
    moneyInput: Number,
    toast: (message) => messages.push(message),
    saveDepositAdjustment: () =>
      assert.fail("cancelled amount should not reach persistence"),
    validateAdjustment:
      context.window.PropertyDeskDepositAdjustmentModel.validate,
    resolveAdjustmentType:
      context.window.PropertyDeskDepositAdjustmentModel.resolveType,
    promptAction: () => {
      promptCount += 1;
      return null;
    },
  });

  assert.equal(
    await entry.recordDepositAdjustment("rental-1", "unknown"),
    false,
  );
  assert.equal(
    await entry.recordDepositAdjustment("rental-1", "retained"),
    false,
  );
  assert.equal(promptCount, 1);
  assert.deepEqual(messages, []);
});
