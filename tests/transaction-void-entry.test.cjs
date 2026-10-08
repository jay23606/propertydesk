const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

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

  assert.equal(Object.isFrozen(entry), true);
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
