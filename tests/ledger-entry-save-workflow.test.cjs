const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadSaveWorkflow() {
  const context = vm.createContext({ window: {} });
  for (const filename of [
    "repository-write-feedback.js",
    "ledger-entry-save-workflow.js",
  ]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
      context,
    );
  }
  return context;
}

test("shared transaction save routes corrections and completes successful entries", async () => {
  const context = loadSaveWorkflow();
  const calls = [];
  const state = { pendingCorrection: null };
  const workflow = context.window.PropertyDeskLedgerEntrySaveWorkflow.create({
    $: (id) => id,
    state,
    saveCorrection: (...args) => calls.push(["correct", ...args]),
    closeModal: (id) => calls.push(["close", id]),
    fetchAll: async () => calls.push(["refresh"]),
    toast: (message) => calls.push(["toast", message]),
  });

  await workflow.saveTransactionEntry({
    kind: "payment",
    event: { submitter: { id: "payment-save-next" } },
    payload: { amount: 550 },
    buildCorrection: (payload) => ({ ...payload, correction: true }),
    insert: async ({ payload }) => {
      calls.push(["insert", payload]);
      return true;
    },
    failureMessage: "payment failed",
    label: "Payment",
    modalId: "payment-modal",
    resetAfterSave: (accountId) => calls.push(["reset", accountId]),
    resetArguments: ["account-1"],
    prepareNext: () => calls.push(["prepare-next"]),
  });

  assert.deepEqual(calls, [
    ["insert", { amount: 550 }],
    ["reset", "account-1"],
    ["refresh"],
    ["prepare-next"],
    ["toast", "Payment recorded. Ready for the next entry"],
  ]);

  calls.length = 0;
  state.pendingCorrection = { kind: "payment" };
  await workflow.saveTransactionEntry({
    kind: "payment",
    event: { submitter: { id: "payment-save-next" } },
    payload: { amount: 595 },
    buildCorrection: (payload) => ({ ...payload, correction: true }),
    insert: async () => assert.fail("correction must not insert a new row"),
    failureMessage: "payment failed",
    label: "Payment",
    modalId: "payment-modal",
    resetAfterSave: () => calls.push(["reset"]),
  });
  assert.deepEqual(calls, [
    ["correct", "payment", { amount: 595, correction: true }],
  ]);
});

test("failed transaction insert skips successful-entry completion", async () => {
  const context = loadSaveWorkflow();
  const calls = [];
  const workflow = context.window.PropertyDeskLedgerEntrySaveWorkflow.create({
    $: (id) => id,
    state: { pendingCorrection: null },
    saveCorrection() {},
    closeModal() {},
    fetchAll: async () => calls.push("refresh"),
    toast: (message) => calls.push(message),
  });

  await workflow.saveTransactionEntry({
    kind: "expense",
    event: { submitter: { id: "expense-save" } },
    payload: { amount: 100 },
    buildCorrection: (payload) => payload,
    insert: async () => false,
    failureMessage: "expense failed",
    label: "Expense",
    modalId: "expense-modal",
    resetAfterSave: () => calls.push("reset"),
  });

  assert.deepEqual(calls, []);
});

test("saved transaction explains refresh failure to prevent duplicate entry", async () => {
  const context = loadSaveWorkflow();
  const calls = [];
  const workflow = context.window.PropertyDeskLedgerEntrySaveWorkflow.create({
    $: (id) => id,
    state: { pendingCorrection: null },
    saveCorrection() {},
    closeModal: (id) => calls.push(["close", id]),
    fetchAll: async () => {
      calls.push(["refresh"]);
      throw new Error("offline");
    },
    toast: (message) => calls.push(["toast", message]),
  });

  await workflow.saveTransactionEntry({
    kind: "payment",
    event: { submitter: { id: "payment-save" } },
    payload: { amount: 550 },
    buildCorrection: (payload) => payload,
    insert: async () => true,
    failureMessage: "payment failed",
    label: "Payment",
    modalId: "payment-modal",
    resetAfterSave: () => calls.push(["reset"]),
  });

  assert.deepEqual(calls, [
    ["reset"],
    ["refresh"],
    [
      "toast",
      "Payment was saved, but the workspace could not refresh. Reload before recording it again.",
    ],
  ]);
});
