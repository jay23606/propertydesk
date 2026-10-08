const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { loadRepositoryWriteFeedback } = require("./feature-test-helpers.cjs");
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
    repository: context.window.PropertyDeskAccountRepository.create({
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
  const feature = context.window.PropertyDeskAccountCloseMaintenance.create({
    repository: context.window.PropertyDeskAccountRepository.create({
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
  assert.deepEqual(calls, []);
  assert.deepEqual(messages, [
    "Account close result couldn't be confirmed. Reload the account before trying again.",
  ]);
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

test("account close entry confirms before delegating to persistence", async () => {
  const calls = [];
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "account-close-entry.js"),
      "utf8",
    ),
    context,
  );
  const account = { id: "account-1", name: "Rental" };
  const entry = context.window.PropertyDeskAccountCloseEntry.create({
    confirmAction: (message) => {
      calls.push(["confirm", message]);
      return true;
    },
    saveCloseAccount: (value) => calls.push(["save", value]),
  });

  assert.equal(Object.isFrozen(entry), true);
  await entry.closeAccount(account);

  assert.deepEqual(calls, [
    [
      "confirm",
      "Close “Rental”? Its payment history will remain in your records.",
    ],
    ["save", account],
  ]);
});

test("account close entry does not persist when confirmation is declined", () => {
  const calls = [];
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "account-close-entry.js"),
      "utf8",
    ),
    context,
  );
  const entry = context.window.PropertyDeskAccountCloseEntry.create({
    confirmAction: () => false,
    saveCloseAccount: () => calls.push("save"),
  });

  assert.equal(entry.closeAccount({ id: "account-1", name: "Rental" }), false);
  assert.deepEqual(calls, []);
});
