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
    confirmAction: () => assert.fail("unsupported kinds must not prompt"),
    saveVoidTransaction: () => assert.fail("unsupported kinds must not write"),
  });

  assert.equal(
    await entry.voidTransaction("unexpected", "transaction-1"),
    false,
  );
  assert.deepEqual(calls, [["toast", "This transaction type can't be voided"]]);
});

test("app composes transaction history and maintenance without a broad wrapper", () => {
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  assert.match(app, /PropertyDeskTransactionCorrections\.create\(/);
  assert.match(app, /PropertyDeskRecordEntryWorkflow\.create\(/);
  assert.doesNotMatch(app, /PropertyDeskLedgerWorkflow/);
  assert.match(app, /PropertyDeskTransactionHistoryWorkflow\.create\(/);
  assert.doesNotMatch(app, /PropertyDeskTransactionViews\.create\(/);
  assert.match(app, /renderPayments,/);
  assert.match(app, /PropertyDeskTransactionMaintenanceWorkflow\.create\(/);
  assert.match(
    app,
    /eventBinders:[\s\S]*?attachTransactionViewEvents,\s*attachTransactionActionEvents,/,
  );
  assert.doesNotMatch(app, /function attachTransactionEvents\(/);
  assert.doesNotMatch(app, /PropertyDeskTransactionWorkflow\.create\(/);
});

test("transaction maintenance workflow composes correction and void actions", () => {
  const passed = {};
  const correctTransaction = () => "corrected";
  const voidTransaction = () => "voided";
  const context = vm.createContext({
    window: {
      PropertyDeskTransactionMaintenance: {
        create: (options) => {
          passed.void = options;
          return { saveVoidTransaction: voidTransaction };
        },
      },
      PropertyDeskTransactionVoidEntry: {
        create: (options) => {
          passed.voidEntry = options;
          return { voidTransaction };
        },
      },
      PropertyDeskTransactionCorrectionForm: {
        create: (options) => {
          passed.correction = options;
          return { correctTransaction };
        },
      },
      PropertyDeskTransactionViewEvents: {
        create: (options) => {
          passed.events = options;
          return { attachEvents: () => "action events" };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "features",
        "transaction-maintenance-workflow.js",
      ),
      "utf8",
    ),
    context,
  );
  const dependencies = {
    $() {},
    state: {},
    toast() {},
    fetchAll() {},
    prettyType() {},
    openPayment() {},
    openExpense() {},
    updatePaymentGuidance() {},
    EventClass: class {},
    OptionClass: class {},
    documentRef: {},
  };
  const workflow =
    context.window.PropertyDeskTransactionMaintenanceWorkflow.create(
      dependencies,
    );

  assert.equal(passed.void.state, dependencies.state);
  assert.equal(passed.void.fetchAll, dependencies.fetchAll);
  assert.equal(passed.void.confirmAction, undefined);
  assert.equal(passed.voidEntry.toast, dependencies.toast);
  assert.equal(passed.voidEntry.saveVoidTransaction, voidTransaction);
  assert.equal(
    passed.correction.updatePaymentGuidance,
    dependencies.updatePaymentGuidance,
  );
  assert.equal(passed.correction.OptionClass, dependencies.OptionClass);
  assert.equal(passed.events.correctTransaction, correctTransaction);
  assert.equal(passed.events.voidTransaction, voidTransaction);
  assert.deepEqual(Object.keys(workflow), ["attachTransactionActionEvents"]);
  assert.equal(workflow.attachTransactionActionEvents(), "action events");
});

test("transaction maintenance voids a posted row with an audit reason", async () => {
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
      path.join(__dirname, "..", "features", "transaction-maintenance.js"),
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
  const feature = context.window.PropertyDeskTransactionMaintenance.create({
    state,
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

test("transaction maintenance rejects unsupported kinds before prompting or writing", async () => {
  const context = vm.createContext({ window: {} });
  for (const filename of [
    "transaction-void-model.js",
    "repository-query-utils.js",
    "repository-write-feedback.js",
    "transaction-repository.js",
    "transaction-maintenance.js",
  ]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
      context,
    );
  }
  const messages = [];
  const feature = context.window.PropertyDeskTransactionMaintenance.create({
    state: {
      client: {
        from: () => assert.fail("unsupported kind must not write"),
      },
    },
    toast: (message) => messages.push(message),
    fetchAll: async () => assert.fail("unsupported kind must not refresh"),
  });

  await feature.saveVoidTransaction("unexpected", "transaction-1", "reason");
  assert.deepEqual(messages, ["This transaction type can't be voided"]);
});

test("transaction maintenance reports rejected void requests without refreshing", async () => {
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
      path.join(__dirname, "..", "features", "transaction-maintenance.js"),
      "utf8",
    ),
    context,
  );
  const messages = [];
  const feature = context.window.PropertyDeskTransactionMaintenance.create({
    state: {
      client: {
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
      },
    },
    fetchAll: async () => assert.fail("failed void request must not refresh"),
    toast: (message) => messages.push(message),
  });

  await assert.doesNotReject(
    feature.saveVoidTransaction("income", "payment-1", "Entered in error"),
  );
  assert.deepEqual(messages, [
    "Transaction couldn't be voided right now. Please try again.",
  ]);
});

test("transaction maintenance reports returned database errors without refreshing", async () => {
  const context = vm.createContext({ window: {} });
  for (const filename of [
    "transaction-void-model.js",
    "repository-write-feedback.js",
    "transaction-maintenance.js",
  ]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
      context,
    );
  }
  const messages = [];
  const feature = context.window.PropertyDeskTransactionMaintenance.create({
    state: { client: {} },
    repository: {
      voidPosted: async () => ({
        data: null,
        error: { message: "Permission denied" },
      }),
    },
    fetchAll: async () => assert.fail("database errors must not refresh"),
    toast: (message) => messages.push(message),
  });

  await feature.saveVoidTransaction("income", "payment-1", "Entered in error");

  assert.deepEqual(messages, ["Permission denied"]);
});

test("transaction maintenance reports an already-changed row without refreshing", async () => {
  const context = vm.createContext({ window: {} });
  for (const filename of [
    "transaction-void-model.js",
    "repository-write-feedback.js",
    "transaction-maintenance.js",
  ]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
      context,
    );
  }
  const messages = [];
  const feature = context.window.PropertyDeskTransactionMaintenance.create({
    state: { client: {} },
    repository: {
      voidPosted: async () => ({ data: null, error: null }),
    },
    fetchAll: async () => assert.fail("a missing row must not refresh"),
    toast: (message) => messages.push(message),
  });

  await feature.saveVoidTransaction("income", "payment-1", "Entered in error");

  assert.deepEqual(messages, [
    "This transaction was already voided or is no longer available.",
  ]);
});
