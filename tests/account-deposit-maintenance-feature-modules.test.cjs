const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("account maintenance workflow composes account closure only", () => {
  const passed = {};
  const closeAccount = () => "closed";
  const context = vm.createContext({
    window: {
      PropertyDeskAccountMaintenance: {
        create: (options) => { passed.account = options; return { closeAccount }; },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", "account-maintenance-workflow.js"), "utf8"),
    context,
  );
  const dependencies = { $() {}, state: {}, toast() {}, fetchAll() {}, closeModal() {} };
  const workflow = context.window.PropertyDeskAccountMaintenanceWorkflow.create(dependencies);

  assert.equal(passed.account.state, dependencies.state);
  assert.equal(passed.account.closeModal, dependencies.closeModal);
  assert.equal(workflow.closeAccount, closeAccount);
  assert.equal("recordDepositAdjustment" in workflow, false);
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
    fetchAll: async () => { refreshes += 1; },
    confirmAction: () => true,
    promptAction: () => prompts.shift(),
  });

  assert.equal(await feature.recordDepositAdjustment("rental-1", "retained"), true);

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
    fs.readFileSync(path.join(__dirname, "..", "features", "deposit-maintenance.js"), "utf8"),
    context,
  );
  const prompts = ["25.00", "Retention correction"];
  const messages = [];
  const feature = context.window.PropertyDeskDepositMaintenance.create({
    state: {
      workspaceOwnerId: "workspace-1",
      accounts: [{ id: "rental-1", account_type: "rental" }],
      client: {
        from: () => ({ insert: async () => { throw new Error("offline"); } }),
      },
    },
    moneyInput: Number,
    todayIso: () => "2026-10-04",
    toast: (message) => messages.push(message),
    fetchAll: async () => assert.fail("failed save must not refresh"),
    promptAction: () => prompts.shift(),
  });

  assert.equal(await feature.recordDepositAdjustment("rental-1", "retained"), false);
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
    fs.readFileSync(path.join(__dirname, "..", "features", "account-maintenance.js"), "utf8"),
    context,
  );
  const calls = [];
  const messages = [];
  const feature = context.window.PropertyDeskAccountMaintenance.create({
    $: (id) => ({ id }),
    state: {
      client: {
        from: () => ({
          update: () => ({ eq: async () => { throw new Error("offline"); } }),
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
