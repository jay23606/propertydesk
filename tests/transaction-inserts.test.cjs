const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadTransactionInserts(client, messages = []) {
  const context = vm.createContext({ window: {} });
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
    state: { client },
    toast: (message) => messages.push(message),
  });
}

test("transaction inserts write a posted ledger row to the requested table", async () => {
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
    await inserts.insertTransaction({
      table: "pd_payments",
      payload: { amount: 500 },
      failureMessage: "Payment unavailable",
    }),
    true,
  );
  assert.deepEqual(calls, [["pd_payments", { amount: 500 }]]);
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
    await backendError.insertTransaction({
      table: "pd_expenses",
      payload: { amount: 100 },
      failureMessage: "Expense unavailable",
    }),
    false,
  );
  assert.equal(
    await connectionError.insertTransaction({
      table: "pd_expenses",
      payload: { amount: 100 },
      failureMessage: "Expense unavailable",
    }),
    false,
  );
  assert.deepEqual(messages, ["Denied", "Expense unavailable"]);
});
