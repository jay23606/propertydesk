const assert = require("node:assert/strict");
const test = require("node:test");
const {
  loadLedgerEntryForms,
  loadPropertyAndAccountForms,
  formElements,
} = require("./feature-test-helpers.cjs");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("ledger entry workflow publishes an explicit payment and expense interface", () => {
  const calls = [];
  const passed = {};
  const buildPaymentPayload = () => ({ payment_payload: true });
  const buildExpensePayload = () => ({ expense_payload: true });
  const paymentActions = {
    updateAllocationPreview: () => "preview",
    prefillPaymentAmount: () => "prefill",
    savePayment: () => "payment",
    openPayment: () => "open payment",
    openPropertyPayment: () => "open property payment",
    attachEvents: () => calls.push("payment events"),
  };
  const expenseActions = {
    saveExpense: () => "expense",
    openExpense: () => "open expense",
    attachEvents: () => calls.push("expense events"),
  };
  const context = vm.createContext({
    window: {
      PropertyDeskTransactionPayloads: {
        buildPayment: buildPaymentPayload,
        buildExpense: buildExpensePayload,
      },
      PropertyDeskPaymentEntryForm: { create: (options) => { passed.payment = options; return paymentActions; } },
      PropertyDeskExpenseEntryForm: { create: (options) => { passed.expense = options; return expenseActions; } },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "ledger-entry-forms.js"),
      "utf8",
    ),
    context,
  );
  const dependencies = {
    $() {}, state: {}, moneyInput() {}, todayIso() {}, toast() {},
    closeModal() {}, fetchAll() {}, fillSelect() {}, populateFormOptions() {},
    prettyType() {}, openModal() {}, saveCorrection() {}, unrelatedDependency() {},
  };
  const forms = context.window.PropertyDeskLedgerEntryForms.create(dependencies);

  assert.deepEqual(
    Object.keys(forms).sort(),
    [
      "attachEvents",
      "openExpense",
      "openPayment",
      "openPropertyPayment",
      "prefillPaymentAmount",
      "saveExpense",
      "savePayment",
      "updateAllocationPreview",
    ].sort(),
  );
  assert.equal(
    forms.updateAllocationPreview,
    paymentActions.updateAllocationPreview,
  );
  assert.equal(forms.openExpense, expenseActions.openExpense);
  assert.deepEqual(Object.keys(passed.payment).sort(), [
    "$", "buildPaymentPayload", "closeModal", "fetchAll", "fillSelect", "moneyInput", "openModal",
    "populateFormOptions", "prettyType", "saveCorrection", "state", "todayIso", "toast",
  ].sort());
  assert.deepEqual(Object.keys(passed.expense).sort(), [
    "$", "buildExpensePayload", "closeModal", "fetchAll", "fillSelect", "moneyInput", "openModal",
    "populateFormOptions", "prettyType", "saveCorrection", "state", "todayIso", "toast",
  ].sort());
  assert.equal(passed.payment.saveCorrection, dependencies.saveCorrection);
  assert.equal(passed.expense.saveCorrection, dependencies.saveCorrection);
  assert.equal(passed.payment.buildPaymentPayload, buildPaymentPayload);
  assert.equal(passed.expense.buildExpensePayload, buildExpensePayload);
  forms.attachEvents();
  assert.deepEqual(calls, ["payment events", "expense events"]);
});


test("property and account form modules expose separate APIs", () => {
  const context = vm.createContext({ window: {} });
  loadPropertyAndAccountForms(context);
  const dependencies = {
    $: formElements(), state: {}, toast() {}, closeModal() {}, fetchAll() {},
    moneyInput() {}, todayIso: () => "2026-10-05", populateFormOptions() {},
    openModal() {},
  };
  const property = context.window.PropertyDeskPropertyForm.create(dependencies);
  const account = context.window.PropertyDeskAccountForm.create({
    ...dependencies,
    buildAccountPayload: context.window.PropertyDeskAccountPayload.build,
    formModel: context.window.PropertyDeskAccountFormModel,
  });

  assert.deepEqual(Object.keys(property).sort(), [
    "attachEvents", "resetPropertyForm", "saveProperty",
  ]);
  assert.deepEqual(Object.keys(account).sort(), [
    "attachEvents", "editAccount", "resetAccountForm", "saveAccount", "updateLoanFields",
  ]);
});


test("account form view resets and populates fields without owning persistence", () => {
  const context = vm.createContext({ window: {} });
  loadPropertyAndAccountForms(context);
  const elements = formElements({ "account-type": "rental" });
  const toggles = [];
  const opened = [];
  elements("loan-fields").classList.toggle = (...args) => toggles.push(args);
  const view = context.window.PropertyDeskAccountFormView.create({
    $: elements,
    todayIso: () => "2026-10-05",
    populateFormOptions: () => opened.push("options"),
    openModal: (id) => opened.push(id),
  });

  view.editAccount({
    id: "account-1",
    account_type: "note",
    property_id: "property-1",
    name: "Seller note",
    party_name: "Buyer",
    party_email: "buyer@example.com",
    party_phone: "555-0100",
    monthly_reminder_enabled: false,
    start_date: "2024-01-01",
    next_due_date: "2026-11-01",
    payment_amount: 550,
    payment_frequency: "monthly",
    original_principal: 40000,
    principal_interest_amount: 400,
    escrow_amount: 150,
    balance_adjustment: 100,
    agreement_effective_date: "2025-06-01",
    interest_rate: 5,
    term_months: 360,
    balloon_date: "",
    late_fee: 25,
    grace_days: 5,
    notes: "Current agreement",
  });

  assert.equal(elements("account-modal-title").textContent, "Edit account");
  assert.equal(elements("account-party-phone").value, "555-0100");
  assert.equal(elements("account-escrow").value, 150);
  assert.equal(elements("account-term").value, 360);
  assert.deepEqual(
    JSON.parse(JSON.stringify(view.readValues())),
    {
      id: "account-1",
      type: "note",
      propertyId: "property-1",
      name: "Seller note",
      partyName: "Buyer",
      partyEmail: "buyer@example.com",
      partyPhone: "555-0100",
      reminderEnabled: false,
      startDate: "2024-01-01",
      nextDueDate: "2026-11-01",
      paymentAmount: 550,
      paymentFrequency: "monthly",
      originalPrincipal: 40000,
      principalInterestAmount: 400,
      escrowAmount: 150,
      balanceAdjustment: 100,
      interestRate: 5,
      termMonths: 360,
      balloonDate: "",
      agreementEffectiveDate: "2025-06-01",
      agreementChangeReason: "",
      lateFee: 25,
      graceDays: 5,
      notes: "Current agreement",
    },
  );
  assert.deepEqual(opened, ["options", "account-modal"]);
  assert.deepEqual(toggles.at(-1), ["hidden", false]);

  elements("account-type").value = "rental";
  view.resetAccountForm();
  assert.equal(elements("account-id").value, "");
  assert.equal(elements("account-start").value, "2026-10-05");
  assert.equal(elements("account-reminder-enabled").checked, false);
  assert.deepEqual(toggles.at(-1), ["hidden", true]);
});


test("property/account forms and ledger-entry forms expose separate workflows", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "create-actions.js"),
      "utf8",
    ),
    context,
  );
  loadPropertyAndAccountForms(context);
  loadLedgerEntryForms(context);
  const formContext = {
    $: formElements(), state: {}, toast() {}, closeModal() {}, fetchAll() {},
    moneyInput: Number, todayIso: () => "2026-10-05", populateFormOptions() {},
    openModal() {},
  };
  const property = context.window.PropertyDeskPropertyForm.create(formContext);
  const account = context.window.PropertyDeskAccountForm.create({
    ...formContext,
    buildAccountPayload: context.window.PropertyDeskAccountPayload.build,
    formModel: context.window.PropertyDeskAccountFormModel,
  });
  const ledger = context.window.PropertyDeskLedgerEntryForms.create({});
  const actions = context.window.PropertyDeskCreateActions.create({});
  for (const [feature, names] of [
    [
      property,
      ["resetPropertyForm", "saveProperty", "attachEvents"],
    ],
    [
      account,
      ["resetAccountForm", "saveAccount", "editAccount", "attachEvents"],
    ],
    [
      ledger,
      [
        "savePayment",
        "saveExpense",
        "openPayment",
        "prefillPaymentAmount",
        "openPropertyPayment",
        "openExpense",
        "attachEvents",
      ],
    ],
    [actions, ["attachEvents"]],
  ]) {
    for (const name of names)
      assert.equal(typeof feature[name], "function", name);
  }
});


test("property and account forms report rejected saves without running success actions", async () => {
  const context = vm.createContext({ window: {} });
  loadPropertyAndAccountForms(context);
  const messages = [];
  const $ = formElements({
    "property-name": "Rental house",
    "property-address": "10 Main St",
    "property-kind": "residential",
    "account-type": "rental",
    "account-name": "Monthly rent",
    "account-start": "2026-10-01",
    "account-frequency": "monthly",
  });
  const state = {
    workspaceOwnerId: "workspace-1",
    client: {
      from: () => ({
        insert: async () => {
          throw new Error("offline");
        },
      }),
    },
  };
  const dependencies = {
    $,
    state,
    toast: (message) => messages.push(message),
    closeModal: () => assert.fail("rejected save must keep its form open"),
    fetchAll: async () => assert.fail("rejected save must not refresh"),
  };
  const property = context.window.PropertyDeskPropertyForm.create(dependencies);
  const account = context.window.PropertyDeskAccountForm.create({
    ...dependencies,
    moneyInput: Number,
    todayIso: () => "2026-10-05",
    populateFormOptions() {},
    openModal() {},
    buildAccountPayload: context.window.PropertyDeskAccountPayload.build,
    formModel: context.window.PropertyDeskAccountFormModel,
  });

  await assert.doesNotReject(property.saveProperty({ preventDefault() {} }));
  await assert.doesNotReject(account.saveAccount({ preventDefault() {} }));
  assert.deepEqual(messages, [
    "Property couldn't be saved right now. Check your connection and try again.",
    "Account couldn't be saved right now. Check your connection and try again.",
  ]);
});


test("payment and expense forms report rejected saves without clearing the entries", async () => {
  const context = vm.createContext({ window: {}, Event });
  loadLedgerEntryForms(context);
  const messages = [];
  const values = {
    "payment-account": "rental-1",
    "payment-amount": "500",
    "payment-date": "2026-10-05",
    "payment-method": "check",
    "payment-memo": "October",
    "income-category": "rent",
    "expense-property": "property-1",
    "expense-category": "repair",
    "expense-amount": "100",
    "expense-date": "2026-10-05",
    "expense-method": "check",
    "expense-memo": "Plumbing repair",
  };
  const $ = formElements(values);
  const state = {
    workspaceOwnerId: "workspace-1",
    accounts: [
      { id: "rental-1", property_id: "property-1", account_type: "rental" },
    ],
    pendingCorrection: null,
    client: {
      from: () => ({
        insert: async () => {
          throw new Error("offline");
        },
      }),
      rpc: async () => {
        throw new Error("offline");
      },
    },
  };
  const corrections = [];
  const forms = context.window.PropertyDeskLedgerEntryForms.create({
    $,
    state,
    moneyInput: Number,
    todayIso: () => "2026-10-05",
    toast: (message) => messages.push(message),
    closeModal: () => assert.fail("rejected save must keep its form open"),
    fetchAll: async () => assert.fail("rejected save must not refresh"),
    fillSelect() {},
    populateFormOptions() {},
    prettyType: (type) => type,
    openModal() {},
    saveCorrection: (...args) => corrections.push(args),
  });

  await assert.doesNotReject(forms.savePayment({ preventDefault() {} }));
  await assert.doesNotReject(forms.saveExpense({ preventDefault() {} }));
  state.pendingCorrection = { kind: "payment", id: "payment-1", reason: "fix" };
  await assert.doesNotReject(forms.savePayment({ preventDefault() {} }));
  state.pendingCorrection = { kind: "expense", id: "expense-1", reason: "fix" };
  await assert.doesNotReject(forms.saveExpense({ preventDefault() {} }));
  assert.deepEqual(messages, [
    "Payment couldn't be saved right now. Check your connection and try again.",
    "Expense couldn't be saved right now. Check your connection and try again.",
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(corrections)), [
    [
      "payment",
      {
        account_id: "rental-1",
        amount: 500,
        received_date: "2026-10-05",
        payment_method: "check",
        income_category: "rent",
        principal_amount: 0,
        interest_amount: 0,
        fee_amount: 0,
        escrow_amount: 0,
        unapplied_amount: 0,
        memo: "October",
      },
    ],
    [
      "expense",
      {
        property_id: "property-1",
        account_id: null,
        amount: 100,
        expense_date: "2026-10-05",
        category: "repair",
        payee: null,
        payment_method: "check",
        memo: "Plumbing repair",
      },
    ],
  ]);
});


test("record-entry feature owns form event bindings and category hints", () => {
  const context = vm.createContext({ window: {} });
  loadPropertyAndAccountForms(context);
  loadLedgerEntryForms(context);
  const handlers = new Map();
  const toggles = [];
  const elements = new Map();
  const getElement = (id) => {
    if (!elements.has(id)) {
      elements.set(id, {
        value: id === "account-type" ? "rental" : "deposit_refund",
        addEventListener(event, handler) {
          handlers.set(`${id}:${event}`, handler);
        },
        classList: {
          toggle: (...args) => toggles.push([id, ...args]),
        },
      });
    }
    return elements.get(id);
  };
  const formContext = {
    $: getElement,
    state: { accounts: [] },
    fillSelect() {},
    prettyType: (type) => type,
  };
  const propertyForm = context.window.PropertyDeskPropertyForm.create({
    ...formContext,
    toast() {}, closeModal() {}, fetchAll() {},
  });
  const accountForm = context.window.PropertyDeskAccountForm.create({
    ...formContext,
    todayIso: () => "2026-10-05", populateFormOptions() {}, openModal() {},
    moneyInput: Number, toast() {}, closeModal() {}, fetchAll() {},
    buildAccountPayload: context.window.PropertyDeskAccountPayload.build,
    formModel: context.window.PropertyDeskAccountFormModel,
  });
  const entryForms =
    context.window.PropertyDeskLedgerEntryForms.create(formContext);

  propertyForm.attachEvents();
  accountForm.attachEvents(() => {});
  entryForms.attachEvents();
  assert.equal(typeof handlers.get("property-form:submit"), "function");
  assert.equal(typeof handlers.get("payment-form:submit"), "function");
  handlers.get("account-type:change")();
  handlers.get("expense-category:change")();
  assert.deepEqual(toggles, [
    ["loan-fields", "hidden", true],
    ["deposit-refund-hint", "hidden", false],
  ]);
});


test("expense entry saves a property-level contractor expense through the expense workflow", async () => {
  const context = vm.createContext({ window: {}, Event });
  loadLedgerEntryForms(context);
  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id)) {
      elements.set(id, {
        value:
          {
            "expense-property": "property-1",
            "expense-category": "contractor_labor",
            "expense-payee": "Roofing Co",
            "expense-method": "check",
            "expense-amount": "425.50",
            "expense-date": "2026-10-04",
            "expense-memo": "Roof repair",
          }[id] || "",
        textContent: "",
        classList: { add() {}, remove() {}, toggle() {} },
        querySelector: () => ({ textContent: "" }),
        reset() {},
      });
    }
    return elements.get(id);
  };
  const calls = [];
  const state = {
    workspaceOwnerId: "workspace-1",
    accounts: [],
    pendingCorrection: null,
    client: {
      from(table) {
        assert.equal(table, "pd_expenses");
        return {
          async insert(payload) {
            state.savedExpense = payload;
            return { error: null };
          },
        };
      },
    },
  };
  const forms = context.window.PropertyDeskLedgerEntryForms.create({
    $: element,
    state,
    moneyInput: Number,
    todayIso: () => "2026-10-05",
    toast: (message) => calls.push(`toast:${message}`),
    closeModal: () => calls.push("close-modal"),
    fetchAll: async () => calls.push("refresh"),
    fillSelect() {},
    populateFormOptions() {},
    prettyType: (value) => value,
    openModal() {},
  });

  await forms.saveExpense({ preventDefault() {} });

  assert.deepEqual(JSON.parse(JSON.stringify(state.savedExpense)), {
    user_id: "workspace-1",
    property_id: "property-1",
    account_id: null,
    amount: 425.5,
    expense_date: "2026-10-04",
    category: "contractor_labor",
    payee: "Roofing Co",
    payment_method: "check",
    memo: "Roof repair",
    source_type: "manual",
  });
  assert.deepEqual(calls, ["refresh", "close-modal", "toast:Expense recorded"]);
});


test("expense entry requires a rental account before recording a deposit refund", async () => {
  const context = vm.createContext({ window: {}, Event });
  loadLedgerEntryForms(context);
  const values = {
    "expense-account": "loan-account",
    "expense-category": "deposit_refund",
  };
  const calls = [];
  const forms = context.window.PropertyDeskLedgerEntryForms.create({
    $: (id) => ({ value: values[id] || "" }),
    state: {
      accounts: [{ id: "loan-account", account_type: "note" }],
      pendingCorrection: null,
      client: {
        from() {
          throw new Error("should not save");
        },
      },
    },
    moneyInput: Number,
    todayIso: () => "2026-10-05",
    toast: (message) => calls.push(message),
    closeModal() {},
    fetchAll: async () => {},
    fillSelect() {},
    populateFormOptions() {},
    prettyType: (value) => value,
    openModal() {},
  });

  await forms.saveExpense({ preventDefault() {} });
  assert.deepEqual(calls, [
    "Choose a rental account for a security deposit refund",
  ]);
});


test("record-entry feature owns create actions and handles empty workspace states", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "create-actions.js"),
      "utf8",
    ),
    context,
  );
  const handlers = new Map();
  const calls = [];
  const elements = new Map();
  const getElement = (id) => {
    if (!elements.has(id)) {
      elements.set(id, {
        value: id === "account-type" ? "rental" : "",
        checked: false,
        textContent: "",
        addEventListener(event, handler) {
          handlers.set(`${id}:${event}`, handler);
        },
        querySelector: () => ({ textContent: "" }),
        classList: { toggle() {}, remove() {}, add() {} },
        reset() {
          calls.push(`reset:${id}`);
        },
      });
    }
    return elements.get(id);
  };
  const button = (id) => getElement(id);
  const selectors = {
    '[data-open="property-modal"]': [button("property")],
    '[data-open="account-modal"]': [button("account")],
    '[data-open="payment-modal"]': [button("payment")],
    '[data-open="expense-modal"]': [button("expense")],
  };
  const state = { properties: [], accounts: [] };
  const feature = context.window.PropertyDeskCreateActions.create({
    $: getElement,
    state,
    resetPropertyForm: () => getElement("property-form").reset(),
    resetAccountForm: () => getElement("account-form").reset(),
    documentRef: { querySelectorAll: (selector) => selectors[selector] || [] },
    todayIso: () => "2026-10-04",
    toast: (message) => calls.push(`toast:${message}`),
    populateFormOptions: () => calls.push("populate-options"),
    openModal: (id) => calls.push(`open:${id}`),
    openPayment: () => calls.push("open-payment"),
    openExpense: () => calls.push("open-expense"),
  });
  const navigate = (view) => calls.push(`navigate:${view}`);

  feature.attachEvents(navigate);
  handlers.get("account:click")();
  handlers.get("payment:click")();
  handlers.get("expense:click")();
  assert.deepEqual(calls, [
    "toast:Add a property before creating an account",
    "navigate:properties",
    "toast:Add an account before recording a payment",
    "navigate:properties",
    "toast:Add a property before recording an expense",
    "navigate:properties",
  ]);

  calls.length = 0;
  handlers.get("property:click")();
  state.properties.push({ id: "property-1" });
  handlers.get("account:click")();
  handlers.get("expense:click")();
  assert.deepEqual(calls, [
    "reset:property-form",
    "open:property-modal",
    "reset:account-form",
    "populate-options",
    "open:account-modal",
    "open-expense",
  ]);
});


test("opening a payment for an account prefills its scheduled installment without overwriting typed amount", () => {
  const context = vm.createContext({ window: {} });
  loadLedgerEntryForms(context);
  const elements = new Map([
    ["payment-account", { value: "" }],
    ["payment-amount", { value: "" }],
    ["payment-date", { value: "" }],
    [
      "payment-form",
      {
        reset() {
          elements.get("payment-account").value = "";
          elements.get("payment-amount").value = "";
        },
      },
    ],
    ["payment-modal", { querySelector: () => ({ textContent: "" }) }],
    ["payment-modal-title", { textContent: "" }],
    ["payment-save-button", { textContent: "" }],
    ["payment-save-next", { classList: { remove() {} } }],
    ["allocation-preview", { innerHTML: "" }],
    ["income-category-wrap", { classList: { toggle() {} } }],
  ]);
  elements.get("payment-account").value = "account-1";
  const feature = context.window.PropertyDeskLedgerEntryForms.create({
    $: (id) => elements.get(id),
    state: {
      accounts: [
        { id: "account-1", payment_amount: 647, account_type: "rental" },
      ],
      pendingCorrection: null,
    },
    moneyInput: Number,
    populateFormOptions() {},
    fillSelect() {},
    prettyType: (value) => value,
    todayIso: () => "2026-10-04",
    openModal() {},
  });

  feature.openPayment("account-1");
  assert.equal(elements.get("payment-amount").value, 647);
  elements.get("payment-amount").value = "300";
  assert.equal(feature.prefillPaymentAmount(), false);
  assert.equal(elements.get("payment-amount").value, "300");
});
