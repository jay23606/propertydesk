const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const {
  loadTransactionRepository,
  transactionWriteFeedbackOptions,
} = require("./transaction-test-helpers.cjs");

function correctionStateOptions(state) {
  return {
    getPendingCorrection: () => state.pendingCorrection,
    getCollectionRows: (collection) => state[collection] || [],
  };
}

test("transaction corrections save payment and expense changes with their audit reasons", async () => {
  const context = vm.createContext({ window: {} });
  loadTransactionRepository(context);
  vm.runInContext(
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "features",
        "transaction-correction-maintenance.js",
      ),
      "utf8",
    ),
    context,
  );
  const rpcCalls = [];
  const events = [];
  const state = {
    pendingCorrection: {
      kind: "payment",
      id: "payment-1",
      reason: "Bank statement",
    },
    payments: [],
    expenses: [],
    client: {
      async rpc(name, args) {
        rpcCalls.push([name, args]);
        return { error: null };
      },
    },
  };
  const feature =
    context.window.PropertyDeskTransactionCorrectionMaintenance.create({
      $: (id) => ({ id }),
      ...transactionWriteFeedbackOptions(context),
      ...correctionStateOptions(state),
      closeModal: (modal) => events.push(["close", modal.id]),
      fetchAll: async () => events.push("refresh"),
      toast: (message) => events.push(["toast", message]),
      repository: context.window.PropertyDeskTransactionRepository.create({
        queryUtils: context.window.PropertyDeskRepositoryQueryUtils,
        getClient: () => state.client,
      }),
    });

  assert.equal(Object.isFrozen(feature), true);
  assert.equal(await feature.saveCorrection("payment", { amount: 75 }), true);
  state.pendingCorrection = {
    kind: "expense",
    id: "expense-1",
    reason: "Duplicate receipt",
  };
  assert.equal(await feature.saveCorrection("expense", { amount: 40 }), true);

  assert.deepEqual(JSON.parse(JSON.stringify(rpcCalls)), [
    [
      "pd_correct_transaction",
      {
        p_kind: "payment",
        p_transaction_id: "payment-1",
        p_correction: { amount: 75 },
        p_reason: "Bank statement",
      },
    ],
    [
      "pd_correct_transaction",
      {
        p_kind: "expense",
        p_transaction_id: "expense-1",
        p_correction: { amount: 40 },
        p_reason: "Duplicate receipt",
      },
    ],
  ]);
  assert.deepEqual(events, [
    ["close", "payment-modal"],
    "refresh",
    ["toast", "Payment corrected; original kept in history"],
    ["close", "expense-modal"],
    "refresh",
    ["toast", "Expense corrected; original kept in history"],
  ]);
});

test("transaction correction failures preserve the open form and pending correction", async () => {
  const context = vm.createContext({ window: {} });
  loadTransactionRepository(context);
  vm.runInContext(
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "features",
        "transaction-correction-maintenance.js",
      ),
      "utf8",
    ),
    context,
  );
  const messages = [];
  let closes = 0;
  let refreshes = 0;
  const state = {
    pendingCorrection: { kind: "payment", id: "payment-1", reason: "Fix date" },
    payments: [],
    expenses: [],
    client: {
      rpc: async () => {
        throw new Error("offline");
      },
    },
  };
  const feature =
    context.window.PropertyDeskTransactionCorrectionMaintenance.create({
      $: (id) => ({ id }),
      ...transactionWriteFeedbackOptions(context),
      ...correctionStateOptions(state),
      closeModal: () => {
        closes += 1;
      },
      fetchAll: async () => {
        refreshes += 1;
      },
      toast: (message) => messages.push(message),
      repository: context.window.PropertyDeskTransactionRepository.create({
        queryUtils: context.window.PropertyDeskRepositoryQueryUtils,
        getClient: () => state.client,
      }),
    });

  assert.equal(await feature.saveCorrection("payment", { amount: 75 }), false);
  assert.equal(await feature.saveCorrection("expense", { amount: 75 }), false);
  state.pendingCorrection = {
    kind: "deposit",
    id: "deposit-1",
    reason: "Unsupported kind",
  };
  assert.equal(await feature.saveCorrection("deposit", { amount: 75 }), false);
  assert.equal(state.pendingCorrection.id, "deposit-1");
  assert.equal(closes, 0);
  assert.equal(refreshes, 1);
  assert.deepEqual(messages, [
    "Transaction history was refreshed. Check it before trying the correction again.",
    "This correction is no longer available.",
    "This correction is no longer available.",
  ]);
});

test("transaction correction confirms a lost response from the audit link", async () => {
  const context = vm.createContext({ window: {} });
  loadTransactionRepository(context);
  vm.runInContext(
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "features",
        "transaction-correction-maintenance.js",
      ),
      "utf8",
    ),
    context,
  );
  const events = [];
  const state = {
    pendingCorrection: { kind: "payment", id: "payment-1", reason: "Fix date" },
    payments: [],
    expenses: [],
  };
  const feature =
    context.window.PropertyDeskTransactionCorrectionMaintenance.create({
      $: (id) => ({ id }),
      ...transactionWriteFeedbackOptions(context),
      ...correctionStateOptions(state),
      closeModal: (modal) => events.push(["close", modal.id]),
      fetchAll: async () => {
        state.payments = [
          {
            id: "replacement-1",
            correction_of_payment_id: "payment-1",
          },
        ];
        events.push(["refresh"]);
      },
      toast: (message) => events.push(["toast", message]),
      repository: {
        correct: async () => {
          throw new Error("connection lost");
        },
      },
    });

  assert.equal(await feature.saveCorrection("payment", { amount: 75 }), true);
  assert.deepEqual(events, [
    ["refresh"],
    ["close", "payment-modal"],
    ["toast", "Payment corrected; original kept in history"],
  ]);
});

test("transaction correction database errors keep the correction open", async () => {
  const context = vm.createContext({ window: {} });
  loadTransactionRepository(context);
  vm.runInContext(
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "features",
        "transaction-correction-maintenance.js",
      ),
      "utf8",
    ),
    context,
  );
  const messages = [];
  let closes = 0;
  let refreshes = 0;
  const state = {
    pendingCorrection: {
      kind: "payment",
      id: "payment-1",
      reason: "Fix date",
    },
    payments: [],
    expenses: [],
  };
  const feature =
    context.window.PropertyDeskTransactionCorrectionMaintenance.create({
      $: () => ({}),
      ...transactionWriteFeedbackOptions(context),
      ...correctionStateOptions(state),
      closeModal: () => closes++,
      fetchAll: async () => refreshes++,
      toast: (message) => messages.push(message),
      repository: context.window.PropertyDeskTransactionRepository.create({
        queryUtils: context.window.PropertyDeskRepositoryQueryUtils,
        getClient: () => ({
          rpc: async () => ({ error: { message: "permission denied" } }),
        }),
      }),
    });

  assert.equal(await feature.saveCorrection("payment", { amount: 75 }), false);
  assert.equal(closes, 0);
  assert.equal(refreshes, 0);
  assert.deepEqual(messages, [
    "Correction failed; original entry is unchanged. permission denied",
  ]);
});
