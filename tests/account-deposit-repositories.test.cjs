const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadRepository(filename, key) {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "repository-query-utils.js"),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
    context,
  );
  const repository = context.window[key];
  return {
    ...repository,
    create: (options) =>
      repository.create({
        ...options,
        queryUtils: context.window.PropertyDeskRepositoryQueryUtils,
      }),
  };
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
  const repositoryFactory = loadRepository(
    "account-repository.js",
    "PropertyDeskAccountRepository",
  );
  const repository = repositoryFactory.create({ getClient: () => client });

  assert.equal(await repository.save({ name: "New" }), result);
  assert.equal(await repository.save({ name: "Edited" }, "a-1"), result);
  assert.equal(await repository.close("a-1"), result);
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
  const repositoryFactory = loadRepository(
    "deposit-repository.js",
    "PropertyDeskDepositRepository",
  );
  const repository = repositoryFactory.create({ getClient: () => client });
  const payload = {
    account_id: "rental-1",
    entry_type: "retained",
    amount: 100,
    reason: "Inspection retention",
  };

  assert.equal(await repository.insert(payload), result);
  assert.deepEqual(calls, [
    ["from", "pd_deposit_entries"],
    ["insert", payload],
  ]);
});
