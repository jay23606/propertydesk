const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadTransactionRepository(context) {
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "repository-query-utils.js"),
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
}

function transactionVoidModelOptions(context) {
  if (!context.window.PropertyDeskTransactionVoidModel) {
    vm.runInContext(
      fs.readFileSync(
        path.join(__dirname, "..", "features", "transaction-void-model.js"),
        "utf8",
      ),
      context,
    );
  }
  return {
    resolveVoidTarget:
      context.window.PropertyDeskTransactionVoidModel.resolveVoidTarget,
    buildVoidPayload:
      context.window.PropertyDeskTransactionVoidModel.buildVoidPayload,
  };
}

test("transaction void model maps supported kinds and preserves audit defaults", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "transaction-void-model.js"),
      "utf8",
    ),
    context,
  );
  const model = context.window.PropertyDeskTransactionVoidModel;

  assert.deepEqual(
    JSON.parse(JSON.stringify(model.resolveVoidTarget("income"))),
    { table: "pd_payments", label: "income entry" },
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(model.resolveVoidTarget("expense"))),
    { table: "pd_expenses", label: "expense" },
  );
  assert.equal(model.resolveVoidTarget("unknown"), null);
  assert.deepEqual(
    JSON.parse(
      JSON.stringify(model.buildVoidPayload("  Entered in error  ", "now")),
    ),
    { status: "voided", voided_at: "now", void_reason: "Entered in error" },
  );
  assert.equal(
    model.buildVoidPayload("   ", "later").void_reason,
    "Voided by owner",
  );
});

test("transaction void entry confirms, collects a reason, then delegates persistence", async () => {
  const context = vm.createContext({ window: {} });
  for (const filename of [
    "transaction-void-model.js",
    "transaction-void-entry.js",
  ]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
      context,
    );
  }
  const calls = [];
  const entry = context.window.PropertyDeskTransactionVoidEntry.create({
    toast: (message) => calls.push(["toast", message]),
    ...transactionVoidModelOptions(context),
    confirmAction: (message) => {
      calls.push(["confirm", message]);
      return true;
    },
    promptAction: (message, initialValue) => {
      calls.push(["prompt", message, initialValue]);
      return "Entered in error";
    },
    saveVoidTransaction: (...args) => {
      calls.push(["save", ...args]);
      return true;
    },
  });

  assert.equal(await entry.voidTransaction("income", "payment-1"), true);
  assert.deepEqual(calls, [
    [
      "confirm",
      "Void this income entry? It will remain in the audit history but stop affecting balances and reports.",
    ],
    ["prompt", "Optional reason for the audit record:", "Entered in error"],
    ["save", "income", "payment-1", "Entered in error"],
  ]);
});

test("transaction void entry rejects unsupported kinds before asking for confirmation", async () => {
  const context = vm.createContext({ window: {} });
  for (const filename of [
    "transaction-void-model.js",
    "transaction-void-entry.js",
  ]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
      context,
    );
  }
  const calls = [];
  const entry = context.window.PropertyDeskTransactionVoidEntry.create({
    toast: (message) => calls.push(["toast", message]),
    ...transactionVoidModelOptions(context),
    confirmAction: () => assert.fail("unsupported kinds must not prompt"),
    saveVoidTransaction: () => assert.fail("unsupported kinds must not write"),
  });

  assert.equal(
    await entry.voidTransaction("unexpected", "transaction-1"),
    false,
  );
  assert.deepEqual(calls, [["toast", "This transaction type can't be voided"]]);
});

test("app composes transaction history and maintenance actions independently", () => {
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  assert.match(app, /PropertyDeskTransactionRecordsWorkflow\.create\(/);
  const transactionWorkflow = fs.readFileSync(
    path.join(__dirname, "..", "features", "transaction-records-workflow.js"),
    "utf8",
  );
  assert.match(
    transactionWorkflow,
    /PropertyDeskTransactionViews\.create\(\{[\s\S]*?sumOperatingExpenses,/,
  );
  assert.match(
    transactionWorkflow,
    /transactionMaintenance\.createTransactionActionHandlers\(/,
  );
  assert.match(
    transactionWorkflow,
    /PropertyDeskTransactionMaintenanceWorkflow\.create\(maintenance\)/,
  );
  assert.doesNotMatch(app, /PropertyDeskRecordEntryWorkflow\.create\(/);
  assert.doesNotMatch(app, /PropertyDeskLedgerWorkflow/);
  assert.doesNotMatch(app, /PropertyDeskTransactionScreenWorkflow\.create\(/);
  assert.match(app, /renderPayments,/);
  assert.doesNotMatch(app, /transactionMaintenance\.createActionHandlers\(/);
  assert.match(
    app,
    /eventBindersBeforeAuth:[\s\S]*?attachTransactionFilterEvents,\s*attachTransactionActionEvents,/,
  );
  assert.doesNotMatch(app, /function attachTransactionEvents\(/);
  assert.doesNotMatch(app, /PropertyDeskTransactionWorkflow\.create\(/);
});

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
    repository: context.window.PropertyDeskTransactionRepository.create({
      getClient: () => state.client,
    }),
    ...transactionVoidModelOptions(context),
    timestamp: () => "2026-10-04T12:00:00.000Z",
    fetchAll: async () => {
      refreshes += 1;
    },
    toast: (message) => messages.push(message),
  });

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
    toast: (message) => messages.push(message),
    fetchAll: async () => assert.fail("unsupported kind must not refresh"),
    repository: context.window.PropertyDeskTransactionRepository.create({
      getClient: () => ({
        from: () => assert.fail("unsupported kind must not write"),
      }),
    }),
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
  const feature = context.window.PropertyDeskTransactionVoidMaintenance.create({
    fetchAll: async () => assert.fail("failed void request must not refresh"),
    toast: (message) => messages.push(message),
    repository: context.window.PropertyDeskTransactionRepository.create({
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
    ...transactionVoidModelOptions(context),
  });

  await assert.doesNotReject(
    feature.saveVoidTransaction("income", "payment-1", "Entered in error"),
  );
  assert.deepEqual(messages, [
    "Transaction couldn't be voided right now. Please try again.",
  ]);
});

test("transaction void maintenance reports database errors without refreshing", async () => {
  const context = vm.createContext({ window: {} });
  for (const filename of [
    "transaction-void-model.js",
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
    repository: {
      voidPosted: async () => ({
        data: null,
        error: { message: "Permission denied" },
      }),
    },
    ...transactionVoidModelOptions(context),
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
    repository: {
      voidPosted: async () => ({ data: null, error: null }),
    },
    ...transactionVoidModelOptions(context),
    fetchAll: async () => assert.fail("a missing row must not refresh"),
    toast: (message) => messages.push(message),
  });

  await feature.saveVoidTransaction("income", "payment-1", "Entered in error");

  assert.deepEqual(messages, [
    "This transaction was already voided or is no longer available.",
  ]);
});
