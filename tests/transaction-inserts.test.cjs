const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadTransactionInserts(client, messages = [], options = {}) {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "repository-query-utils.js"),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "features",
        "workspace-write-reconciliation.js",
      ),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "repository-write-feedback.js"),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "transaction-repository.js"),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "transaction-inserts.js"),
      "utf8",
    ),
    context,
  );
  return context.window.PropertyDeskTransactionInserts.create({
    state: options.state,
    fetchAll: options.fetchAll,
    toast: (message) => messages.push(message),
    repository: context.window.PropertyDeskTransactionRepository.create({
      getClient: () => client,
    }),
  });
}

test("transaction entry actions write to their dedicated ledgers", async () => {
  const calls = [];
  const inserts = loadTransactionInserts({
    from(table) {
      return {
        async insert(payload) {
          calls.push([table, payload]);
          return { error: null };
        },
      };
    },
  });

  assert.equal(
    await inserts.insertPayment({
      payload: { amount: 500 },
      failureMessage: "Payment unavailable",
    }),
    true,
  );
  assert.equal(
    await inserts.insertExpense({
      payload: { amount: 100 },
      failureMessage: "Expense unavailable",
    }),
    true,
  );
  assert.deepEqual(calls, [
    ["pd_payments", { amount: 500 }],
    ["pd_expenses", { amount: 100 }],
  ]);
});

test("transaction inserts reconcile a lost response against refreshed ledger rows", async () => {
  const messages = [];
  const state = {
    payments: [],
    expenses: [],
  };
  let refreshes = 0;
  const inserts = loadTransactionInserts(
    {
      from: () => ({
        insert: async () => {
          throw new Error("connection lost");
        },
      }),
    },
    messages,
    {
      state,
      fetchAll: async () => {
        state.payments = [
          {
            user_id: "workspace-1",
            account_id: "account-1",
            amount: "550.00",
            received_date: "2026-10-08",
            payment_method: "manual",
            income_category: "installment",
            principal_amount: "0",
            interest_amount: "0",
            fee_amount: "0",
            escrow_amount: "0",
            unapplied_amount: "550",
            memo: null,
            source_type: "manual",
          },
        ];
        refreshes += 1;
      },
    },
  );

  assert.equal(
    await inserts.insertPayment({
      payload: {
        user_id: "workspace-1",
        account_id: "account-1",
        amount: 550,
        received_date: "2026-10-08",
        payment_method: "manual",
        income_category: "installment",
        principal_amount: 0,
        interest_amount: 0,
        fee_amount: 0,
        escrow_amount: 0,
        unapplied_amount: 550,
        memo: null,
        source_type: "manual",
      },
      failureMessage: "Payment could not be confirmed",
    }),
    true,
  );
  assert.equal(refreshes, 1);
  assert.deepEqual(messages, []);
});

test("transaction entry completion reuses its readback refresh after a lost response", async () => {
  const events = [];
  const payload = { amount: 550, memo: "October payment" };
  const state = { payments: [], expenses: [] };
  let refreshes = 0;
  const inserts = loadTransactionInserts(
    {
      from: () => ({
        insert: async () => {
          throw new Error("connection lost");
        },
      }),
    },
    [],
    {
      state,
      fetchAll: async () => {
        state.payments = [payload];
        refreshes++;
        events.push("refresh");
      },
    },
  );

  assert.equal(
    await inserts.insertPayment({
      payload,
      failureMessage: "Payment could not be confirmed",
      completion: {
        onSaved: () => events.push("reset-before-refresh"),
        onRefreshed: ({ recordWasSaved }) =>
          events.push(["readback", recordWasSaved]),
        afterRefresh: () => events.push("normal completion"),
        onReconciled: () => events.push("confirmed completion"),
        successMessage: "Payment recorded",
        savedRefreshFailureMessage: "Saved; refresh failed",
      },
    }),
    true,
  );
  assert.equal(refreshes, 1);
  assert.deepEqual(events, [
    "refresh",
    ["readback", true],
    "confirmed completion",
  ]);
});

test("transaction inserts ask the user to inspect refreshed rows before retrying", async () => {
  const messages = [];
  const inserts = loadTransactionInserts(
    {
      from: () => ({
        insert: async () => {
          throw new Error("connection lost");
        },
      }),
    },
    messages,
    {
      state: { payments: [], expenses: [] },
      fetchAll: async () => {},
    },
  );

  assert.equal(
    await inserts.insertExpense({
      payload: { amount: 100, property_id: "property-1" },
      failureMessage: "Expense could not be confirmed",
    }),
    false,
  );
  assert.deepEqual(messages, [
    "Ledger was refreshed. Check it before recording this entry again.",
  ]);
});

test("transaction inserts report backend and connection errors without success", async () => {
  const messages = [];
  const backendError = loadTransactionInserts(
    {
      from: () => ({ insert: async () => ({ error: { message: "Denied" } }) }),
    },
    messages,
  );
  const connectionError = loadTransactionInserts(
    {
      from: () => ({
        insert: async () => Promise.reject(new Error("offline")),
      }),
    },
    messages,
  );

  assert.equal(
    await backendError.insertExpense({
      payload: { amount: 100 },
      failureMessage: "Expense unavailable",
    }),
    false,
  );
  assert.equal(
    await connectionError.insertPayment({
      payload: { amount: 100 },
      failureMessage: "Payment unavailable",
    }),
    false,
  );
  assert.deepEqual(messages, ["Denied", "Payment unavailable"]);
});
