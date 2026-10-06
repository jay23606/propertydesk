const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadRepository(filename, key) {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
    context,
  );
  return context.window[key];
}

test("account repository inserts and updates only account rows", async () => {
  const calls = [];
  const result = { error: null };
  const client = {
    from(table) {
      calls.push(["from", table]);
      return {
        insert(payload) {
          calls.push(["insert", payload]);
          return result;
        },
        update(payload) {
          calls.push(["update", payload]);
          return {
            eq(column, value) {
              calls.push(["eq", column, value]);
              return result;
            },
          };
        },
      };
    },
  };
  const repository = loadRepository(
    "account-repository.js",
    "PropertyDeskAccountRepository",
  );

  assert.equal(await repository.save(client, { name: "New" }), result);
  assert.equal(
    await repository.save(client, { name: "Edited" }, "a-1"),
    result,
  );
  assert.equal(await repository.close(client, "a-1"), result);
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [
    ["from", "pd_accounts"],
    ["insert", { name: "New" }],
    ["from", "pd_accounts"],
    ["update", { name: "Edited" }],
    ["eq", "id", "a-1"],
    ["from", "pd_accounts"],
    ["update", { status: "closed" }],
    ["eq", "id", "a-1"],
  ]);
});

test("deposit repository inserts an audited entry into the deposit ledger", async () => {
  const calls = [];
  const result = { error: null };
  const client = {
    from(table) {
      calls.push(["from", table]);
      return {
        insert(payload) {
          calls.push(["insert", payload]);
          return result;
        },
      };
    },
  };
  const repository = loadRepository(
    "deposit-repository.js",
    "PropertyDeskDepositRepository",
  );
  const payload = {
    account_id: "rental-1",
    entry_type: "retained",
    amount: 100,
    reason: "Inspection retention",
  };

  assert.equal(await repository.insert(client, payload), result);
  assert.deepEqual(calls, [
    ["from", "pd_deposit_entries"],
    ["insert", payload],
  ]);
});
