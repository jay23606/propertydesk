const assert = require("node:assert/strict");
const test = require("node:test");
const { loadLedgerEntryForms, loadImportFeatures } = require("./feature-test-helpers.cjs");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("account maintenance workflow composes account closure and deposit actions", () => {
  const passed = {};
  const closeAccount = () => "closed";
  const recordDepositAdjustment = () => "adjusted";
  const context = vm.createContext({
    window: {
      PropertyDeskAccountMaintenance: {
        create: (options) => { passed.account = options; return { closeAccount }; },
      },
      PropertyDeskDepositMaintenance: {
        create: (options) => { passed.deposit = options; return { recordDepositAdjustment }; },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", "account-maintenance-workflow.js"), "utf8"),
    context,
  );
  const dependencies = { $() {}, state: {}, moneyInput() {}, todayIso() {}, toast() {}, fetchAll() {}, closeModal() {} };
  const workflow = context.window.PropertyDeskAccountMaintenanceWorkflow.create(dependencies);

  assert.equal(passed.account.state, dependencies.state);
  assert.equal(passed.account.closeModal, dependencies.closeModal);
  assert.equal(passed.deposit.moneyInput, dependencies.moneyInput);
  assert.equal(passed.deposit.todayIso, dependencies.todayIso);
  assert.equal(workflow.closeAccount, closeAccount);
  assert.equal(workflow.recordDepositAdjustment, recordDepositAdjustment);
});

test("transaction maintenance workflow composes correction and void actions", () => {
  const passed = {};
  const correctTransaction = () => "corrected";
  const voidTransaction = () => "voided";
  const context = vm.createContext({
    window: {
      PropertyDeskTransactionMaintenance: {
        create: (options) => { passed.void = options; return { voidTransaction }; },
      },
      PropertyDeskTransactionCorrectionForm: {
        create: (options) => { passed.correction = options; return { correctTransaction }; },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", "transaction-maintenance-workflow.js"), "utf8"),
    context,
  );
  const dependencies = {
    $() {}, state: {}, toast() {}, fetchAll() {}, prettyType() {}, openPayment() {},
    openExpense() {}, updateAllocationPreview() {}, EventClass: class {}, OptionClass: class {},
  };
  const workflow = context.window.PropertyDeskTransactionMaintenanceWorkflow.create(dependencies);

  assert.equal(passed.void.state, dependencies.state);
  assert.equal(passed.void.fetchAll, dependencies.fetchAll);
  assert.equal(passed.correction.updateAllocationPreview, dependencies.updateAllocationPreview);
  assert.equal(passed.correction.OptionClass, dependencies.OptionClass);
  assert.equal(workflow.correctTransaction, correctTransaction);
  assert.equal(workflow.voidTransaction, voidTransaction);
});

test("deposit maintenance retains adjustment audit details", async () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "deposit-maintenance.js"),
      "utf8",
    ),
    context,
  );
  const prompts = ["250.00", "Deposit retention per move-out inspection"];
  const inserts = [];
  const messages = [];
  let refreshes = 0;
  const state = {
    workspaceOwnerId: "workspace-1",
    accounts: [{ id: "rental-1", account_type: "rental" }],
    client: {
      from(table) {
        return {
          async insert(payload) {
            inserts.push([table, payload]);
            return { error: null };
          },
        };
      },
    },
  };
  const feature = context.window.PropertyDeskDepositMaintenance.create({
    state,
    moneyInput: Number,
    todayIso: () => "2026-10-04",
    toast: (message) => messages.push(message),
    fetchAll: async () => { refreshes += 1; },
    confirmAction: () => true,
    promptAction: () => prompts.shift(),
  });

  assert.equal(await feature.recordDepositAdjustment("rental-1", "retained"), true);

  assert.equal(inserts[0][0], "pd_deposit_entries");
  assert.equal(inserts[0][1].user_id, "workspace-1");
  assert.equal(inserts[0][1].amount, 250);
  assert.equal(
    inserts[0][1].reason,
    "Deposit retention per move-out inspection",
  );
  assert.equal(messages.at(-1), "Deposit retention recorded");
  assert.equal(refreshes, 1);
});

test("deposit maintenance reports a rejected save without refreshing as if it succeeded", async () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", "deposit-maintenance.js"), "utf8"),
    context,
  );
  const prompts = ["25.00", "Retention correction"];
  const messages = [];
  const feature = context.window.PropertyDeskDepositMaintenance.create({
    state: {
      workspaceOwnerId: "workspace-1",
      accounts: [{ id: "rental-1", account_type: "rental" }],
      client: {
        from: () => ({ insert: async () => { throw new Error("offline"); } }),
      },
    },
    moneyInput: Number,
    todayIso: () => "2026-10-04",
    toast: (message) => messages.push(message),
    fetchAll: async () => assert.fail("failed save must not refresh"),
    promptAction: () => prompts.shift(),
  });

  assert.equal(await feature.recordDepositAdjustment("rental-1", "retained"), false);
  assert.deepEqual(messages, [
    "Deposit adjustment failed. Check your connection and try again.",
  ]);
});

test("account maintenance closes an account while preserving its history", async () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "account-maintenance.js"),
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
  const feature = context.window.PropertyDeskAccountMaintenance.create({
    $: (id) => ({ id }),
    state,
    confirmAction: () => true,
    closeModal: (modal) => calls.push(["close", modal.id]),
    fetchAll: async () => calls.push("refresh"),
    toast: (message) => messages.push(message),
  });

  await feature.closeAccount({ id: "account-1", name: "Rental" });

  assert.equal(updates[0][0], "pd_accounts");
  assert.equal(updates[0][1].status, "closed");
  assert.deepEqual(updates[1], ["id", "account-1"]);
  assert.deepEqual(calls, [["close", "detail-modal"], "refresh"]);
  assert.equal(messages.at(-1), "Account closed");
});

test("account maintenance reports rejected requests and skips success actions", async () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", "account-maintenance.js"), "utf8"),
    context,
  );
  const calls = [];
  const messages = [];
  const feature = context.window.PropertyDeskAccountMaintenance.create({
    $: (id) => ({ id }),
    state: {
      client: {
        from: () => ({
          update: () => ({ eq: async () => { throw new Error("offline"); } }),
        }),
      },
    },
    confirmAction: () => true,
    closeModal: () => calls.push("close"),
    fetchAll: async () => calls.push("refresh"),
    toast: (message) => messages.push(message),
  });

  await assert.doesNotReject(
    feature.closeAccount({ id: "account-1", name: "Rental" }),
  );
  assert.deepEqual(calls, []);
  assert.deepEqual(messages, [
    "Account couldn't be closed right now. Please try again.",
  ]);
});

test("transaction maintenance voids a posted row with an audit reason", async () => {
  const context = vm.createContext({
    window: {},
    Event: class MockEvent {},
    Option: class MockOption {},
  });
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
    $() {},
    state,
    confirmAction: () => true,
    promptAction: () => "Entered in error",
    timestamp: () => "2026-10-04T12:00:00.000Z",
    fetchAll: async () => { refreshes += 1; },
    toast: (message) => messages.push(message),
  });

  await feature.voidTransaction("income", "payment-1");

  assert.equal(updates[0][0], "pd_payments");
  assert.equal(updates[0][1].status, "voided");
  assert.equal(updates[0][1].voided_at, "2026-10-04T12:00:00.000Z");
  assert.equal(updates[0][1].void_reason, "Entered in error");
  assert.equal(messages.at(-1), "Transaction voided; original entry preserved");
  assert.equal(refreshes, 1);
});

test("transaction maintenance reports rejected void requests without refreshing", async () => {
  const context = vm.createContext({
    window: {},
    Event: class MockEvent {},
    Option: class MockOption {},
  });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", "transaction-maintenance.js"), "utf8"),
    context,
  );
  const messages = [];
  const feature = context.window.PropertyDeskTransactionMaintenance.create({
    $() {},
    state: {
      client: {
        from: () => ({
          update: () => ({
            eq: () => ({
              eq: () => ({
                select: () => ({
                  maybeSingle: async () => { throw new Error("offline"); },
                }),
              }),
            }),
          }),
        }),
      },
    },
    confirmAction: () => true,
    promptAction: () => "Entered in error",
    fetchAll: async () => assert.fail("failed void request must not refresh"),
    toast: (message) => messages.push(message),
  });

  await assert.doesNotReject(feature.voidTransaction("income", "payment-1"));
  assert.deepEqual(messages, [
    "Transaction couldn't be voided right now. Please try again.",
  ]);
});

test("transaction corrections save payment and expense changes with their audit reasons", async () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", "transaction-corrections.js"), "utf8"),
    context,
  );
  const rpcCalls = [];
  const events = [];
  const state = {
    pendingCorrection: { kind: "payment", id: "payment-1", reason: "Bank statement" },
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
    ["pd_correct_transaction", {
      p_kind: "payment",
      p_transaction_id: "payment-1",
      p_correction: { amount: 75 },
      p_reason: "Bank statement",
    }],
    ["pd_correct_transaction", {
      p_kind: "expense",
      p_transaction_id: "expense-1",
      p_correction: { amount: 40 },
      p_reason: "Duplicate receipt",
    }],
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
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", "transaction-corrections.js"), "utf8"),
    context,
  );
  const messages = [];
  let closes = 0;
  let refreshes = 0;
  const state = {
    pendingCorrection: { kind: "payment", id: "payment-1", reason: "Fix date" },
    client: { rpc: async () => { throw new Error("offline"); } },
  };
  const feature = context.window.PropertyDeskTransactionCorrections.create({
    $: (id) => ({ id }),
    state,
    closeModal: () => { closes += 1; },
    fetchAll: async () => { refreshes += 1; },
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

test("transaction correction form reopens posted payments and expenses with audit reasons", () => {
  const context = vm.createContext({
    window: {},
    Event: class MockEvent {
      constructor(type) {
        this.type = type;
      }
    },
    Option: class MockOption {
      constructor(text, value) { this.text = text; this.value = value; }
    },
  });
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
    updateAllocationPreview: () => calls.push("refresh-allocation"),
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

test("reminder preview uses current form values and escapes recipient-facing text", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "reminder-preview.js"),
      "utf8",
    ),
    context,
  );
  const values = {
    "account-property": { value: "property-1" },
    "account-id": { value: "" },
    "account-type": { value: "land_contract" },
    "account-name": { value: "Installment" },
    "account-party": { value: "<Renter>" },
    "account-start": { value: "" },
    "account-next-due": { value: "" },
    "account-payment": { value: "550" },
    "account-frequency": { value: "monthly" },
    "account-party-email": { value: "buyer@example.test" },
    "reminder-preview-content": { innerHTML: "" },
  };
  const state = {
    properties: [{ id: "property-1", address: "10 Main <St>" }],
    payments: [],
  };
  const calls = [];
  const feature = context.window.PropertyDeskReminderPreview.create({
    $: (id) => values[id],
    state,
    amountDueSince: (accounts, payments, start, end) => {
      calls.push({ account: accounts[0], payments, start, end });
      return 550;
    },
    unpaidDueAccrualStart: () => "2026-10-01",
    todayIso: () => "2026-10-04",
    monthEnd: () => "2026-10-31",
    moneyInput: Number,
    toast: (message) => calls.push(message),
    dateOnly: () => ({ toLocaleDateString: () => "October 2026" }),
    monthStart: () => "2026-10-01",
    propertyAddress: (property) => property.address,
    money: (value) => "USD " + Number(value).toFixed(2),
    esc: (value) =>
      String(value ?? "").replace(
        /[&<>"']/g,
        (char) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[char],
      ),
    openModal: (id) => calls.push(id),
  });

  feature.previewReminderEmail();

  assert.equal(calls[0].account.payment_amount, 550);
  assert.equal(calls[0].start, "2026-10-01");
  assert.match(
    values["reminder-preview-content"].innerHTML,
    /buyer@example\.test/,
  );
  assert.match(values["reminder-preview-content"].innerHTML, /&lt;Renter&gt;/);
  assert.match(values["reminder-preview-content"].innerHTML, /&lt;St&gt;/);
  assert.match(
    values["reminder-preview-content"].innerHTML,
    /Hello &lt;Renter&gt;,<br><br>Our records show no rent or installment payment recorded for October 2026\./,
  );
  assert.match(
    values["reminder-preview-content"].innerHTML,
    /Unpaid due as of 2026-10-31: USD 550\.00<br>Property: 10 Main &lt;St&gt;/,
  );
  assert.equal(calls.at(-1), "reminder-preview-modal");
});

test("recording a loan payment does not invent principal or interest splits", async () => {
  const context = vm.createContext({ window: {} });
  loadLedgerEntryForms(context);

  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id)) {
      elements.set(id, {
        classList: { add() {}, remove() {}, toggle() {} },
        focus() {},
        reset() {},
        value: "",
      });
    }
    return elements.get(id);
  };
  element("payment-account").value = "account-1";
  element("payment-amount").value = "550.00";
  element("payment-date").value = "2026-10-04";
  element("payment-method").value = "manual";
  const state = {
    workspaceOwnerId: "workspace-1",
    accounts: [{ id: "account-1", account_type: "land_contract" }],
    pendingCorrection: null,
    client: {
      from(table) {
        assert.equal(table, "pd_payments");
        return {
          async insert(payload) {
            state.savedPayment = payload;
            return { error: null };
          },
        };
      },
    },
  };
  const feature = context.window.PropertyDeskLedgerEntryForms.create({
    $: element,
    state,
    moneyInput: (value) => Number(value),
    todayIso: () => "2026-10-04",
    toast() {},
    closeModal() {},
    fetchAll: async () => {},
    fillSelect() {},
    populateFormOptions() {},
    prettyType: (value) => value,
    paymentFrequencyLabel: (value) => value,
    openModal() {},
  });

  await feature.savePayment({ preventDefault() {} });

  assert.equal(state.savedPayment.amount, 550);
  assert.equal(state.savedPayment.income_category, "installment");
  assert.equal(state.savedPayment.principal_amount, 0);
  assert.equal(state.savedPayment.interest_amount, 0);
  assert.equal(state.savedPayment.unapplied_amount, 550);
});

test("CSV imports report a real zero accepted by the server as zero", async () => {
  const context = vm.createContext({ window: {} });
  loadImportFeatures(context);

  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id)) {
      elements.set(id, {
        classList: { add() {}, remove() {}, toggle() {} },
        checked: false,
        disabled: false,
        textContent: "",
        value: "",
      });
    }
    return elements.get(id);
  };
  const state = {
    accounts: [],
    properties: [],
    client: { rpc: async () => ({ data: { rows_accepted: 0 }, error: null }) },
  };
  const feature = context.window.PropertyDeskImportFeature.create({
    $: element,
      state,
      stageImport(title, rows, commit, note, report) {
        state.pendingImport = { title, rows, commit, note, ...report };
      },
      parseCSV: () => [{}],
    validateAccountRows: () => ({
      valid: [{ account_name: "Test" }],
      errors: [],
      total: 1,
    }),
    validateExpenseRows() {},
    validatePaymentRows() {},
    esc: (value) => String(value ?? ""),
    todayIso: () => "2026-10-04",
    openModal() {},
    closeModal() {},
    fetchAll: async () => {},
    toast() {},
  });

  await feature.importAccounts({ name: "accounts.csv", text: async () => "" });
  await state.pendingImport.commit(
    state.pendingImport.rows,
    state.pendingImport,
  );

  assert.match(
    element("import-status").textContent,
    /Imported 0 accounts; 1 row was skipped/,
  );
});
