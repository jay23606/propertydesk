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

test("transaction corrections save payment and expense changes with their audit reasons", async () => {
  const context = vm.createContext({ window: {} });
  loadTransactionRepository(context);
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "transaction-corrections.js"),
      "utf8",
    ),
    context,
  );
  const rpcCalls = [];
  const events = [];
  const state = {
    pendingCorrection: {
      kind: "payment",
      id: "payment-1",
      reason: "Bank statement",
    },
    client: {
      async rpc(name, args) {
        rpcCalls.push([name, args]);
        return { error: null };
      },
    },
  };
  const feature = context.window.PropertyDeskTransactionCorrections.create({
    $: (id) => ({ id }),
    state,
    closeModal: (modal) => events.push(["close", modal.id]),
    fetchAll: async () => events.push("refresh"),
    toast: (message) => events.push(["toast", message]),
  });

  assert.equal(await feature.saveCorrection("payment", { amount: 75 }), true);
  state.pendingCorrection = {
    kind: "expense",
    id: "expense-1",
    reason: "Duplicate receipt",
  };
  assert.equal(await feature.saveCorrection("expense", { amount: 40 }), true);

  assert.deepEqual(JSON.parse(JSON.stringify(rpcCalls)), [
    [
      "pd_correct_transaction",
      {
        p_kind: "payment",
        p_transaction_id: "payment-1",
        p_correction: { amount: 75 },
        p_reason: "Bank statement",
      },
    ],
    [
      "pd_correct_transaction",
      {
        p_kind: "expense",
        p_transaction_id: "expense-1",
        p_correction: { amount: 40 },
        p_reason: "Duplicate receipt",
      },
    ],
  ]);
  assert.deepEqual(events, [
    ["close", "payment-modal"],
    "refresh",
    ["toast", "Payment corrected; original kept in history"],
    ["close", "expense-modal"],
    "refresh",
    ["toast", "Expense corrected; original kept in history"],
  ]);
});

test("transaction correction failures preserve the open form and pending correction", async () => {
  const context = vm.createContext({ window: {} });
  loadTransactionRepository(context);
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "transaction-corrections.js"),
      "utf8",
    ),
    context,
  );
  const messages = [];
  let closes = 0;
  let refreshes = 0;
  const state = {
    pendingCorrection: { kind: "payment", id: "payment-1", reason: "Fix date" },
    client: {
      rpc: async () => {
        throw new Error("offline");
      },
    },
  };
  const feature = context.window.PropertyDeskTransactionCorrections.create({
    $: (id) => ({ id }),
    state,
    closeModal: () => {
      closes += 1;
    },
    fetchAll: async () => {
      refreshes += 1;
    },
    toast: (message) => messages.push(message),
  });

  assert.equal(await feature.saveCorrection("payment", { amount: 75 }), false);
  assert.equal(await feature.saveCorrection("expense", { amount: 75 }), false);
  assert.equal(state.pendingCorrection.id, "payment-1");
  assert.equal(closes, 0);
  assert.equal(refreshes, 0);
  assert.deepEqual(messages, [
    "Correction failed; original entry is unchanged. Check your connection and try again.",
    "This correction is no longer available.",
  ]);
});

test("transaction correction database errors keep the correction open", async () => {
  const context = vm.createContext({ window: {} });
  loadTransactionRepository(context);
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "transaction-corrections.js"),
      "utf8",
    ),
    context,
  );
  const messages = [];
  let closes = 0;
  let refreshes = 0;
  const feature = context.window.PropertyDeskTransactionCorrections.create({
    $: () => ({}),
    state: {
      pendingCorrection: {
        kind: "payment",
        id: "payment-1",
        reason: "Fix date",
      },
      client: {
        rpc: async () => ({ error: { message: "permission denied" } }),
      },
    },
    closeModal: () => closes++,
    fetchAll: async () => refreshes++,
    toast: (message) => messages.push(message),
  });

  assert.equal(await feature.saveCorrection("payment", { amount: 75 }), false);
  assert.equal(closes, 0);
  assert.equal(refreshes, 0);
  assert.deepEqual(messages, [
    "Correction failed; original entry is unchanged. permission denied",
  ]);
});

test("transaction correction model resolves only posted payments and expenses", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "transaction-correction-model.js"),
      "utf8",
    ),
    context,
  );
  const payment = {
    id: "payment-1",
    account_id: "account-1",
    status: "posted",
  };
  const expense = { id: "expense-1", status: "posted" };
  const state = {
    payments: [payment, { id: "voided-payment", status: "voided" }],
    expenses: [expense, { id: "voided-expense", status: "voided" }],
    accounts: [{ id: "account-1" }],
  };
  const findTarget =
    context.window.PropertyDeskTransactionCorrectionModel.findCorrectionTarget;

  const paymentTarget = findTarget(state, "income", payment.id);
  assert.equal(paymentTarget.kind, "payment");
  assert.equal(paymentTarget.record, payment);
  assert.equal(paymentTarget.account, state.accounts[0]);
  const expenseTarget = findTarget(state, "expense", expense.id);
  assert.equal(expenseTarget.kind, "expense");
  assert.equal(expenseTarget.record, expense);
  assert.equal(findTarget(state, "income", "voided-payment"), null);
  assert.equal(findTarget(state, "expense", "voided-expense"), null);
  assert.equal(findTarget(state, "income", "missing"), null);
  assert.equal(findTarget(state, "unknown", payment.id), null);
});

test("transaction correction form reopens posted payments and expenses with audit reasons", () => {
  const context = vm.createContext({
    window: {},
    Event: class MockEvent {
      constructor(type) {
        this.type = type;
      }
    },
    Option: class MockOption {
      constructor(text, value) {
        this.text = text;
        this.value = value;
      }
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "transaction-correction-view.js"),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "transaction-correction-model.js"),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "transaction-correction-form.js"),
      "utf8",
    ),
    context,
  );
  const values = new Map();
  const field = (id) => {
    if (!values.has(id))
      values.set(id, {
        value: "",
        textContent: "",
        dispatchEvent(event) {
          this.lastEvent = event.type;
        },
      });
    return values.get(id);
  };
  const accountSelect = {
    value: "",
    options: [{ value: "account-1" }],
    add(option) {
      this.options.push(option);
    },
  };
  values.set("payment-account", accountSelect);
  values.set("payment-modal", {
    querySelector: () => field("payment-eyebrow"),
  });
  values.set("expense-modal", {
    querySelector: () => field("expense-eyebrow"),
  });
  values.set("payment-save-next", {
    classList: { add: (value) => (field("save-next-class").value = value) },
  });
  values.set("expense-save-next", {
    classList: {
      add: (value) => (field("expense-save-next-class").value = value),
    },
  });

  const state = {
    accounts: [
      {
        id: "account-1",
        name: "Land contract",
        party_name: "Buyer",
        account_type: "land_contract",
      },
    ],
    payments: [
      {
        id: "payment-1",
        status: "posted",
        account_id: "account-1",
        amount: 75,
        received_date: "2026-10-02",
        payment_method: "check",
        income_category: "installment",
        memo: "Receipt 14",
      },
    ],
    expenses: [
      {
        id: "expense-1",
        status: "posted",
        property_id: "property-1",
        account_id: "account-1",
        amount: 40,
        expense_date: "2026-10-03",
        category: "repairs",
        payee: "Plumber",
        payment_method: "check",
        memo: "Invoice 2",
      },
    ],
    pendingCorrection: null,
  };
  const calls = [];
  const feature = context.window.PropertyDeskTransactionCorrectionForm.create({
    $: (id) => field(id),
    state,
    promptAction: () => "Corrected bank posting date",
    prettyType: () => "Land contract",
    openPayment: () => calls.push("open-payment"),
    openExpense: () => calls.push("open-expense"),
    updatePaymentGuidance: () => calls.push("refresh-allocation"),
    toast: (message) => calls.push(message),
  });

  feature.correctTransaction("income", "payment-1");

  assert.equal(field("payment-amount").value, 75);
  assert.equal(field("payment-date").value, "2026-10-02");
  assert.equal(field("payment-method").value, "check");
  assert.equal(state.pendingCorrection.kind, "payment");
  assert.equal(state.pendingCorrection.id, "payment-1");
  assert.equal(state.pendingCorrection.reason, "Corrected bank posting date");
  assert.equal(field("payment-modal-title").textContent, "Correct payment");
  assert.equal(field("payment-eyebrow").textContent, "TRANSACTION CORRECTION");
  assert.deepEqual(calls, ["open-payment", "refresh-allocation"]);

  feature.correctTransaction("expense", "expense-1");

  assert.equal(field("expense-amount").value, 40);
  assert.equal(field("expense-date").value, "2026-10-03");
  assert.equal(field("expense-category").value, "repairs");
  assert.equal(field("expense-property").lastEvent, "change");
  assert.equal(state.pendingCorrection.kind, "expense");
  assert.equal(state.pendingCorrection.id, "expense-1");
  assert.equal(field("expense-modal-title").textContent, "Correct expense");
  assert.equal(field("expense-eyebrow").textContent, "TRANSACTION CORRECTION");
  assert.deepEqual(calls, [
    "open-payment",
    "refresh-allocation",
    "open-expense",
  ]);
});
