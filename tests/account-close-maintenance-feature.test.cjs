const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const {
  loadRepositoryWriteFeedback,
  workspaceRecordWriteOptions,
} = require("./feature-test-helpers.cjs");

test("account close maintenance uses its injected record-save operation", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "features", "account-close-maintenance.js"),
    "utf8",
  );
  assert.doesNotMatch(source, /window\.PropertyDeskRepositoryWriteFeedback/);
});

test("account close maintenance preserves the account history", async () => {
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
      path.join(__dirname, "..", "features", "account-repository.js"),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "account-close-maintenance.js"),
      "utf8",
    ),
    context,
  );
  const updates = [];
  const calls = [];
  const messages = [];
  const state = {
    accounts: [{ id: "account-1", status: "closed" }],
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
  const feature = context.window.PropertyDeskAccountCloseMaintenance.create({
    getCollection: (name) => state[name],
    ...workspaceRecordWriteOptions(context),
    repository: context.window.PropertyDeskAccountRepository.create({
      queryUtils: context.window.PropertyDeskRepositoryQueryUtils,
      getClient: () => state.client,
    }),
    closeAccountDetails: () => calls.push(["close-details"]),
    fetchAll: async () => calls.push("refresh"),
    toast: (message) => messages.push(message),
  });

  assert.equal(Object.isFrozen(feature), true);
  await feature.saveCloseAccount({ id: "account-1", name: "Rental" });

  assert.equal(updates[0][0], "pd_accounts");
  assert.equal(updates[0][1].status, "closed");
  assert.deepEqual(updates[1], ["id", "account-1"]);
  assert.deepEqual(calls, [["close-details"], "refresh"]);
  assert.equal(messages.at(-1), "Account closed");
});

test("account close maintenance reports rejected requests without closing details", async () => {
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
      path.join(__dirname, "..", "features", "account-repository.js"),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "account-close-maintenance.js"),
      "utf8",
    ),
    context,
  );
  const calls = [];
  const messages = [];
  const state = { accounts: [{ id: "account-1", status: "active" }] };
  const feature = context.window.PropertyDeskAccountCloseMaintenance.create({
    getCollection: (name) => state[name],
    ...workspaceRecordWriteOptions(context),
    repository: context.window.PropertyDeskAccountRepository.create({
      queryUtils: context.window.PropertyDeskRepositoryQueryUtils,
      getClient: () => ({
        from: () => ({
          update: () => ({
            eq: async () => {
              throw new Error("offline");
            },
          }),
        }),
      }),
    }),
    closeAccountDetails: () => calls.push("close-details"),
    fetchAll: async () => calls.push("refresh"),
    toast: (message) => messages.push(message),
  });

  await assert.doesNotReject(
    feature.saveCloseAccount({ id: "account-1", name: "Rental" }),
  );
  assert.deepEqual(calls, ["refresh"]);
  assert.deepEqual(messages, [
    "Accounts were refreshed. Check the account status before trying again.",
  ]);
});

test("account close confirms a lost response from refreshed account status", async () => {
  const context = vm.createContext({ window: {} });
  loadRepositoryWriteFeedback(context);
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "account-close-maintenance.js"),
      "utf8",
    ),
    context,
  );
  const calls = [];
  const messages = [];
  const state = { accounts: [{ id: "account-1", status: "active" }] };
  const feature = context.window.PropertyDeskAccountCloseMaintenance.create({
    getCollection: (name) => state[name],
    ...workspaceRecordWriteOptions(context),
    repository: {
      close: async () => {
        throw new Error("connection lost");
      },
    },
    closeAccountDetails: () => calls.push("close-details"),
    fetchAll: async () => {
      state.accounts[0].status = "closed";
      calls.push("refresh");
    },
    toast: (message) => messages.push(message),
  });

  assert.equal(
    await feature.saveCloseAccount({ id: "account-1", name: "Rental" }),
    true,
  );
  assert.deepEqual(calls, ["refresh", "close-details"]);
  assert.deepEqual(messages, ["Account closed"]);
});

test("account close maintenance reports database errors before closing details", async () => {
  const context = vm.createContext({ window: {} });
  loadRepositoryWriteFeedback(context);
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "account-close-maintenance.js"),
      "utf8",
    ),
    context,
  );
  const calls = [];
  const messages = [];
  const feature = context.window.PropertyDeskAccountCloseMaintenance.create({
    ...workspaceRecordWriteOptions(context),
    repository: {
      close: async (id) => {
        calls.push(["close", id]);
        return { error: { message: "Permission denied" } };
      },
    },
    closeAccountDetails: () => calls.push("close-details"),
    fetchAll: async () => calls.push("refresh"),
    toast: (message) => messages.push(message),
  });

  await feature.saveCloseAccount({ id: "account-1", name: "Rental" });

  assert.deepEqual(calls, [["close", "account-1"]]);
  assert.deepEqual(messages, ["Permission denied"]);
});
