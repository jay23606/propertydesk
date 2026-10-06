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

function captureFormSubmissions(getElement, formIds) {
  const handlers = new Map();
  const $ = (id) => {
    const element = getElement(id);
    if (typeof element.addEventListener !== "function")
      element.addEventListener = () => {};
    if (formIds.includes(id))
      element.addEventListener = (event, handler) => {
        if (event === "submit") handlers.set(`${id}:${event}`, handler);
      };
    return element;
  };
  return { $, handlers };
}

test("ledger entry workflow publishes an explicit payment and expense interface", () => {
  const calls = [];
  const passed = {};
  const buildPaymentPayload = () => ({ payment_payload: true });
  const buildExpensePayload = () => ({ expense_payload: true });
  const buildPaymentCorrection = () => ({ payment_correction: true });
  const buildExpenseCorrection = () => ({ expense_correction: true });
  const insertTransaction = () => true;
  const paymentActions = {
    updatePaymentGuidance: () => "preview",
    openPayment: () => "open payment",
    openPropertyPayment: () => "open property payment",
    attachEvents: () => calls.push("payment events"),
  };
  const expenseActions = {
    openExpense: () => "open expense",
    attachEvents: () => calls.push("expense events"),
  };
  const context = vm.createContext({
    window: {
      PropertyDeskTransactionPayloads: {
        buildPayment: buildPaymentPayload,
        buildExpense: buildExpensePayload,
        buildPaymentCorrection,
        buildExpenseCorrection,
      },
      PropertyDeskTransactionInserts: {
        create: (options) => {
          passed.persistenceOptions = options;
          return { insertTransaction };
        },
      },
      PropertyDeskLedgerEntrySaveWorkflow: {
        create: (options) => {
          passed.saveWorkflowOptions = options;
          return { finishSuccessfulEntry: () => "finished" };
        },
      },
      PropertyDeskPaymentEntryForm: {
        create: (options) => {
          passed.payment = options;
          return paymentActions;
        },
      },
      PropertyDeskExpenseEntryForm: {
        create: (options) => {
          passed.expense = options;
          return expenseActions;
        },
      },
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
    $() {},
    state: {},
    moneyInput() {},
    todayIso() {},
    toast() {},
    closeModal() {},
    fetchAll() {},
    fillSelect() {},
    populateFormOptions() {},
    prettyType() {},
    openModal() {},
    navigate: () => {},
    previewReminderEmail: () => {},
    saveCorrection() {},
    unrelatedDependency() {},
  };
  const forms =
    context.window.PropertyDeskLedgerEntryForms.create(dependencies);

  assert.deepEqual(
    Object.keys(forms).sort(),
    [
      "attachEvents",
      "openExpense",
      "openPayment",
      "openPropertyPayment",
      "updatePaymentGuidance",
    ].sort(),
  );
  assert.equal(
    forms.updatePaymentGuidance,
    paymentActions.updatePaymentGuidance,
  );
  assert.equal(forms.openExpense, expenseActions.openExpense);
  assert.deepEqual(
    Object.keys(passed.payment).sort(),
    [
      "$",
      "buildPaymentPayload",
      "buildPaymentCorrection",
      "finishSuccessfulEntry",
      "fillSelect",
      "insertTransaction",
      "moneyInput",
      "openModal",
      "populateFormOptions",
      "prettyType",
      "saveCorrection",
      "state",
      "todayIso",
      "toast",
    ].sort(),
  );
  assert.deepEqual(
    Object.keys(passed.expense).sort(),
    [
      "$",
      "buildExpensePayload",
      "buildExpenseCorrection",
      "finishSuccessfulEntry",
      "fillSelect",
      "insertTransaction",
      "moneyInput",
      "openModal",
      "populateFormOptions",
      "prettyType",
      "saveCorrection",
      "state",
      "todayIso",
      "toast",
    ].sort(),
  );
  assert.equal(passed.payment.saveCorrection, dependencies.saveCorrection);
  assert.equal(passed.expense.saveCorrection, dependencies.saveCorrection);
  assert.equal(passed.payment.buildPaymentPayload, buildPaymentPayload);
  assert.equal(passed.expense.buildExpensePayload, buildExpensePayload);
  assert.equal(passed.payment.buildPaymentCorrection, buildPaymentCorrection);
  assert.equal(passed.expense.buildExpenseCorrection, buildExpenseCorrection);
  assert.equal(passed.payment.insertTransaction, insertTransaction);
  assert.equal(passed.expense.insertTransaction, insertTransaction);
  assert.equal(passed.persistenceOptions.state, dependencies.state);
  assert.equal(passed.persistenceOptions.toast, dependencies.toast);
  assert.equal(passed.saveWorkflowOptions.closeModal, dependencies.closeModal);
  assert.equal(passed.saveWorkflowOptions.fetchAll, dependencies.fetchAll);
  assert.equal(passed.payment.finishSuccessfulEntry(), "finished");
  assert.equal(
    passed.expense.finishSuccessfulEntry,
    passed.payment.finishSuccessfulEntry,
  );
  forms.attachEvents();
  assert.deepEqual(calls, ["payment events", "expense events"]);
});

test("shared ledger completion resets, refreshes, then continues or closes", async () => {
  const passed = {};
  const calls = [];
  let failRefresh = false;
  const context = vm.createContext({
    window: {
      PropertyDeskTransactionPayloads: {},
      PropertyDeskTransactionInserts: { create: () => ({}) },
      PropertyDeskPaymentEntryForm: {
        create: (options) => {
          passed.payment = options;
          return {};
        },
      },
      PropertyDeskExpenseEntryForm: {
        create: (options) => {
          passed.expense = options;
          return {};
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "ledger-entry-save-workflow.js"),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "ledger-entry-forms.js"),
      "utf8",
    ),
    context,
  );
  context.window.PropertyDeskLedgerEntryForms.create({
    $: (id) => id,
    closeModal: (id) => calls.push(`close:${id}`),
    fetchAll: async () => {
      calls.push("refresh");
      if (failRefresh) throw new Error("refresh failed");
    },
    toast: (message) => calls.push(`toast:${message}`),
  });

  await passed.payment.finishSuccessfulEntry({
    label: "Payment",
    addAnother: false,
    modalId: "payment-modal",
    resetAfterSave: (accountId) => calls.push(`reset-payment:${accountId}`),
    resetArguments: ["account-1"],
  });
  await passed.expense.finishSuccessfulEntry({
    label: "Expense",
    addAnother: true,
    modalId: "expense-modal",
    resetAfterSave: () => calls.push("reset-expense"),
    prepareNext: (values) => calls.push(`next-expense:${values.propertyId}`),
    nextArguments: [{ propertyId: "property-1" }],
  });

  assert.deepEqual(calls, [
    "reset-payment:account-1",
    "refresh",
    "close:payment-modal",
    "toast:Payment recorded",
    "reset-expense",
    "refresh",
    "next-expense:property-1",
    "toast:Expense recorded. Ready for the next entry",
  ]);
  failRefresh = true;
  await passed.payment.finishSuccessfulEntry({
    label: "Payment",
    addAnother: false,
    modalId: "payment-modal",
    resetAfterSave: (accountId) => calls.push(`reset-payment:${accountId}`),
    resetArguments: ["account-2"],
  });
  assert.deepEqual(calls.slice(-2), ["reset-payment:account-2", "refresh"]);
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
    $: formElements(),
    state: {},
    toast() {},
    closeModal() {},
    fetchAll() {},
    navigate: () => {},
    moneyInput: Number,
    todayIso: () => "2026-10-05",
    populateFormOptions() {},
    openModal() {},
  };
  const property = context.window.PropertyDeskPropertyForm.create(formContext);
  const account = context.window.PropertyDeskAccountForm.create({
    ...formContext,
    previewReminderEmail: () => {},
    buildAccountPayload: context.window.PropertyDeskAccountPayload.build,
    formModel: context.window.PropertyDeskAccountFormModel,
  });
  const ledger = context.window.PropertyDeskLedgerEntryForms.create({});
  const actions = context.window.PropertyDeskCreateActions.create({});
  for (const [feature, names] of [
    [property, ["resetPropertyForm", "attachEvents"]],
    [account, ["resetAccountForm", "editAccount", "attachEvents"]],
    [
      ledger,
      ["openPayment", "openPropertyPayment", "openExpense", "attachEvents"],
    ],
    [actions, ["attachEvents"]],
  ]) {
    for (const name of names)
      assert.equal(typeof feature[name], "function", name);
  }
});

test("payment and expense form workflows publish explicit view operations", () => {
  const context = vm.createContext({ window: {} });
  loadLedgerEntryForms(context);
  const viewDependencies = {};
  context.window.PropertyDeskPaymentEntryView = {
    create: (options) => {
      viewDependencies.payment = options;
      return {
        updatePaymentGuidance() {},
        readValues() {},
        resetAfterSave() {},
        prepareNextPayment() {},
        openPayment() {},
        openPropertyPayment() {},
        attachEvents() {},
      };
    },
  };
  context.window.PropertyDeskExpenseEntryView = {
    create: (options) => {
      viewDependencies.expense = options;
      return {
        openExpense() {},
        prepareNextExpense() {},
        readValues() {},
        resetAfterSave() {},
        attachEvents() {},
      };
    },
  };
  const elements = new Map();
  const $ = (id) => {
    if (!elements.has(id)) {
      elements.set(id, {
        addEventListener() {},
      });
    }
    return elements.get(id);
  };
  const dependencies = {
    $,
    state: { accounts: [] },
    toast() {},
    closeModal() {},
    fetchAll() {},
    moneyInput: Number,
    todayIso: () => "2026-10-05",
    fillSelect() {},
    populateFormOptions() {},
    prettyType: String,
    openModal() {},
    saveCorrection() {},
    buildPaymentPayload() {},
    buildExpensePayload() {},
  };
  const payment =
    context.window.PropertyDeskPaymentEntryForm.create(dependencies);
  const expense =
    context.window.PropertyDeskExpenseEntryForm.create(dependencies);

  assert.deepEqual(Object.keys(viewDependencies.payment).sort(), [
    "$",
    "fillSelect",
    "moneyInput",
    "openModal",
    "populateFormOptions",
    "prettyType",
    "state",
    "toast",
    "todayIso",
  ]);
  assert.deepEqual(Object.keys(viewDependencies.expense).sort(), [
    "$",
    "fillSelect",
    "moneyInput",
    "openModal",
    "populateFormOptions",
    "prettyType",
    "state",
    "todayIso",
  ]);

  assert.deepEqual(Object.keys(payment).sort(), [
    "attachEvents",
    "openPayment",
    "openPropertyPayment",
    "prepareNextPayment",
    "readValues",
    "resetAfterSave",
    "updatePaymentGuidance",
  ]);
  assert.deepEqual(Object.keys(expense).sort(), [
    "attachEvents",
    "openExpense",
    "prepareNextExpense",
    "readValues",
    "resetAfterSave",
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
  const { $, handlers } = captureFormSubmissions(formElements(values), [
    "payment-form",
    "expense-form",
  ]);
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

  forms.attachEvents();
  await assert.doesNotReject(
    handlers.get("payment-form:submit")({ preventDefault() {} }),
  );
  await assert.doesNotReject(
    handlers.get("expense-form:submit")({ preventDefault() {} }),
  );
  state.pendingCorrection = { kind: "payment", id: "payment-1", reason: "fix" };
  await assert.doesNotReject(
    handlers.get("payment-form:submit")({ preventDefault() {} }),
  );
  state.pendingCorrection = { kind: "expense", id: "expense-1", reason: "fix" };
  await assert.doesNotReject(
    handlers.get("expense-form:submit")({ preventDefault() {} }),
  );
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
    toast() {},
    closeModal() {},
    fetchAll() {},
  });
  const accountForm = context.window.PropertyDeskAccountForm.create({
    ...formContext,
    todayIso: () => "2026-10-05",
    populateFormOptions() {},
    openModal() {},
    moneyInput: Number,
    toast() {},
    closeModal() {},
    fetchAll() {},
    previewReminderEmail: () => {},
    buildAccountPayload: context.window.PropertyDeskAccountPayload.build,
    formModel: context.window.PropertyDeskAccountFormModel,
  });
  const entryForms =
    context.window.PropertyDeskLedgerEntryForms.create(formContext);

  propertyForm.attachEvents();
  accountForm.attachEvents();
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
  const navigate = (view) => calls.push(`navigate:${view}`);
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
    navigate,
  });
  feature.attachEvents();
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

  calls.length = 0;
  feature.openAccountForProperty("property-1");
  assert.equal(getElement("account-property").value, "property-1");
  assert.deepEqual(calls, [
    "reset:account-form",
    "populate-options",
    "open:account-modal",
  ]);
});
