const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const {
  loadTransactionRepository,
  transactionWriteFeedbackOptions,
  transactionVoidModelOptions,
} = require("./transaction-test-helpers.cjs");

function voidStateOptions(state = {}) {
  return { getCollectionRows: (collection) => state[collection] || [] };
}

test("transaction void maintenance voids a posted row with an audit reason", async () => {
  const context = vm.createContext({
    window: {},
    Event: class MockEvent {},
    Option: class MockOption {},
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "transaction-void-model.js"),
      "utf8",
    ),
    context,
  );
  loadTransactionRepository(context);
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "transaction-void-maintenance.js"),
      "utf8",
    ),
    context,
  );
  const updates = [];
  const messages = [];
  let refreshes = 0;
  const state = {
    client: {
      from(table) {
        return {
          update(payload) {
            updates.push([table, payload]);
            return {
              eq(column, value) {
                updates.push([column, value]);
                return {
                  eq(statusColumn, status) {
                    updates.push([statusColumn, status]);
                    return {
                      select() {
                        return {
                          async maybeSingle() {
                            return { data: { id: "payment-1" }, error: null };
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
    },
  };
  const feature = context.window.PropertyDeskTransactionVoidMaintenance.create({
    ...voidStateOptions(),
    repository: context.window.PropertyDeskTransactionRepository.create({
      queryUtils: context.window.PropertyDeskRepositoryQueryUtils,
      getClient: () => state.client,
    }),
    ...transactionWriteFeedbackOptions(context),
    ...transactionVoidModelOptions(context),
    timestamp: () => "2026-10-04T12:00:00.000Z",
    fetchAll: async () => {
      refreshes += 1;
    },
    toast: (message) => messages.push(message),
  });

  assert.equal(Object.isFrozen(feature), true);
  await feature.saveVoidTransaction("income", "payment-1", "Entered in error");

  assert.equal(updates[0][0], "pd_payments");
  assert.equal(updates[0][1].status, "voided");
  assert.equal(updates[0][1].voided_at, "2026-10-04T12:00:00.000Z");
  assert.equal(updates[0][1].void_reason, "Entered in error");
  assert.equal(messages.at(-1), "Transaction voided; original entry preserved");
  assert.equal(refreshes, 1);
});

test("transaction void maintenance rejects unsupported kinds before prompting or writing", async () => {
  const context = vm.createContext({ window: {} });
  for (const filename of [
    "transaction-void-model.js",
    "repository-query-utils.js",
    "workspace-write-reconciliation.js",
    "workspace-record-write-workflow.js",
    "repository-write-feedback.js",
    "transaction-repository.js",
    "transaction-void-maintenance.js",
  ]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
      context,
    );
  }
  const messages = [];
  const feature = context.window.PropertyDeskTransactionVoidMaintenance.create({
    ...voidStateOptions(),
    toast: (message) => messages.push(message),
    fetchAll: async () => assert.fail("unsupported kind must not refresh"),
    repository: context.window.PropertyDeskTransactionRepository.create({
      queryUtils: context.window.PropertyDeskRepositoryQueryUtils,
      getClient: () => ({
        from: () => assert.fail("unsupported kind must not write"),
      }),
    }),
    ...transactionWriteFeedbackOptions(context),
    ...transactionVoidModelOptions(context),
  });

  await feature.saveVoidTransaction("unexpected", "transaction-1", "reason");
  assert.deepEqual(messages, ["This transaction type can't be voided"]);
});

test("transaction void maintenance reports rejected requests without refreshing", async () => {
  const context = vm.createContext({
    window: {},
    Event: class MockEvent {},
    Option: class MockOption {},
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "transaction-void-model.js"),
      "utf8",
    ),
    context,
  );
  loadTransactionRepository(context);
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "transaction-void-maintenance.js"),
      "utf8",
    ),
    context,
  );
  const messages = [];
  const refreshes = [];
  const state = { payments: [], expenses: [] };
  const feature = context.window.PropertyDeskTransactionVoidMaintenance.create({
    ...voidStateOptions(state),
    timestamp: () => "2026-10-08T12:00:00.000Z",
    fetchAll: async () => refreshes.push(true),
    toast: (message) => messages.push(message),
    repository: context.window.PropertyDeskTransactionRepository.create({
      queryUtils: context.window.PropertyDeskRepositoryQueryUtils,
      getClient: () => ({
        from: () => ({
          update: () => ({
            eq: () => ({
              eq: () => ({
                select: () => ({
                  maybeSingle: async () => {
                    throw new Error("offline");
                  },
                }),
              }),
            }),
          }),
        }),
      }),
    }),
    ...transactionWriteFeedbackOptions(context),
    ...transactionVoidModelOptions(context),
  });

  await assert.doesNotReject(
    feature.saveVoidTransaction("income", "payment-1", "Entered in error"),
  );
  assert.deepEqual(messages, [
    "Transaction history was refreshed. Check it before trying to void this entry again.",
  ]);
  assert.deepEqual(refreshes, [true]);
});

test("transaction void confirms a lost response from the refreshed audit fields", async () => {
  const context = vm.createContext({ window: {} });
  for (const filename of [
    "transaction-void-model.js",
    "workspace-write-reconciliation.js",
    "workspace-record-write-workflow.js",
    "repository-write-feedback.js",
    "transaction-void-maintenance.js",
  ]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
      context,
    );
  }
  for (const [kind, id, collection] of [
    ["income", "payment-1", "payments"],
    ["expense", "expense-1", "expenses"],
  ]) {
    const events = [];
    const state = { payments: [], expenses: [] };
    state[collection] = [{ id, status: "posted" }];
    const feature =
      context.window.PropertyDeskTransactionVoidMaintenance.create({
        ...voidStateOptions(state),
        repository: {
          voidPosted: async () => {
            throw new Error("connection lost");
          },
        },
        ...transactionWriteFeedbackOptions(context),
        ...transactionVoidModelOptions(context),
        timestamp: () => "2026-10-08T12:00:00.000Z",
        fetchAll: async () => {
          state[collection][0] = {
            id,
            status: "voided",
            voided_at: "2026-10-08T12:00:00.000Z",
            void_reason: "Entered in error",
          };
          events.push(["refresh"]);
        },
        toast: (message) => events.push(["toast", message]),
      });

    assert.equal(
      await feature.saveVoidTransaction(kind, id, "Entered in error"),
      true,
    );
    assert.deepEqual(events, [
      ["refresh"],
      ["toast", "Transaction voided; original entry preserved"],
    ]);
  }
});

test("transaction void maintenance reports database errors without refreshing", async () => {
  const context = vm.createContext({ window: {} });
  for (const filename of [
    "transaction-void-model.js",
    "workspace-write-reconciliation.js",
    "workspace-record-write-workflow.js",
    "repository-write-feedback.js",
    "transaction-void-maintenance.js",
  ]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
      context,
    );
  }
  const messages = [];
  const feature = context.window.PropertyDeskTransactionVoidMaintenance.create({
    ...voidStateOptions(),
    repository: {
      voidPosted: async () => ({
        data: null,
        error: { message: "Permission denied" },
      }),
    },
    ...transactionWriteFeedbackOptions(context),
    ...transactionVoidModelOptions(context),
    timestamp: () => "2026-10-08T12:00:00.000Z",
    fetchAll: async () => assert.fail("database errors must not refresh"),
    toast: (message) => messages.push(message),
  });

  await feature.saveVoidTransaction("income", "payment-1", "Entered in error");

  assert.deepEqual(messages, ["Permission denied"]);
});

test("transaction void maintenance reports an already-changed row without refreshing", async () => {
  const context = vm.createContext({ window: {} });
  for (const filename of [
    "transaction-void-model.js",
    "workspace-write-reconciliation.js",
    "workspace-record-write-workflow.js",
    "repository-write-feedback.js",
    "transaction-void-maintenance.js",
  ]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
      context,
    );
  }
  const messages = [];
  const feature = context.window.PropertyDeskTransactionVoidMaintenance.create({
    ...voidStateOptions(),
    repository: {
      voidPosted: async () => ({ data: null, error: null }),
    },
    ...transactionWriteFeedbackOptions(context),
    ...transactionVoidModelOptions(context),
    timestamp: () => "2026-10-08T12:00:00.000Z",
    fetchAll: async () => assert.fail("a missing row must not refresh"),
    toast: (message) => messages.push(message),
  });

  await feature.saveVoidTransaction("income", "payment-1", "Entered in error");

  assert.deepEqual(messages, [
    "This transaction was already voided or is no longer available.",
  ]);
});
