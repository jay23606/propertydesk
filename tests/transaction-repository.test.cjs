const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadRepository() {
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
      path.join(__dirname, "..", "features", "transaction-repository.js"),
      "utf8",
    ),
    context,
  );
  return context.window.PropertyDeskTransactionRepository;
}

test("transaction repository inserts ledger rows through the selected table", async () => {
  const calls = [];
  const result = { error: null };
  const client = {
    from(table) {
      return {
        insert(payload) {
          calls.push([table, payload]);
          return result;
        },
      };
    },
  };

  const repository = loadRepository().create({ getClient: () => client });
  assert.equal(await repository.insert("pd_payments", { amount: 250 }), result);
  assert.deepEqual(calls, [["pd_payments", { amount: 250 }]]);
});

test("transaction repository forwards audited correction arguments", async () => {
  const calls = [];
  const result = { error: null };
  const client = {
    rpc(name, args) {
      calls.push([name, args]);
      return result;
    },
  };

  const repository = loadRepository().create({ getClient: () => client });
  assert.equal(
    await repository.correct({
      kind: "payment",
      transactionId: "payment-1",
      correction: { amount: 120 },
      reason: "Corrected receipt",
    }),
    result,
  );
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [
    [
      "pd_correct_transaction",
      {
        p_kind: "payment",
        p_transaction_id: "payment-1",
        p_correction: { amount: 120 },
        p_reason: "Corrected receipt",
      },
    ],
  ]);
});

test("transaction repository only voids posted rows and returns the selected row", async () => {
  const calls = [];
  const result = { data: { id: "expense-1" }, error: null };
  const client = {
    from(table) {
      calls.push(["from", table]);
      return {
        update(payload) {
          calls.push(["update", payload]);
          return {
            eq(column, value) {
              calls.push(["eq", column, value]);
              return {
                eq(statusColumn, status) {
                  calls.push(["eq", statusColumn, status]);
                  return {
                    select(columns) {
                      calls.push(["select", columns]);
                      return {
                        maybeSingle() {
                          calls.push(["maybeSingle"]);
                          return result;
                        },
                      };
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  };

  const repository = loadRepository().create({ getClient: () => client });
  assert.equal(
    await repository.voidPosted({
      target: { table: "pd_expenses" },
      id: "expense-1",
      payload: { status: "voided", void_reason: "Duplicate" },
    }),
    result,
  );
  assert.deepEqual(calls, [
    ["from", "pd_expenses"],
    ["update", { status: "voided", void_reason: "Duplicate" }],
    ["eq", "id", "expense-1"],
    ["eq", "status", "posted"],
    ["select", "id"],
    ["maybeSingle"],
  ]);
});
