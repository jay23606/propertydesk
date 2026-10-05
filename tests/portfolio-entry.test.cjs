const assert = require("node:assert/strict");
const test = require("node:test");
const { loadLedgerEntryForms, loadPropertyAccountForms, formElements } = require("./feature-test-helpers.cjs");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("Properties grid totals the visible due, monthly payments, and loan balances", () => {
  const elements = new Map();
  const getElement = (id) => {
    if (!elements.has(id)) {
      elements.set(id, {
        value: id === "property-filter" ? "all" : "",
        checked: false,
        innerHTML: "",
        textContent: "",
        classList: { toggle() {} },
      });
    }
    return elements.get(id);
  };
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", "property-portfolio-table.js"), "utf8"),
    context,
  );
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", "property-portfolio-model.js"), "utf8"),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "property-views.js"),
      "utf8",
    ),
    context,
  );
  const state = {
    properties: [{ id: "property-1", name: "One Oak", address: "1 Oak St" }],
    accounts: [
      {
        id: "account-1",
        property_id: "property-1",
        status: "active",
        account_type: "land_contract",
        payment_amount: 125,
        payment_frequency: "monthly",
        name: "Contract",
        party_name: "Buyer",
      },
      {
        id: "account-2",
        property_id: "property-1",
        status: "active",
        account_type: "rental",
        payment_amount: 200,
        payment_frequency: "monthly",
        name: "Rental",
        party_name: "Tenant",
      },
    ],
    payments: [],
    propertyHolders: [],
    workspaceMembers: [],
    user: null,
  };
  const esc = (value) => String(value ?? "");
  const money = (value) => `$${Number(value).toFixed(2)}`;
  const dependencies = {
    state,
    monthlyScheduledEstimate: (accounts) =>
      accounts.reduce((sum, account) => sum + account.payment_amount, 0),
    accountBalance: (account) => (account.id === "account-1" ? 1000 : 0),
    amountDueSince: (accounts) => (accounts[0].id === "account-1" ? 50 : 80),
    unpaidDueAccrualStart: () => "2026-10-01",
    todayIso: () => "2026-10-04",
    propertyAddress: (property) => property.address,
    monthStart: () => "2026-10-01",
    streetAddress: (property) => property.address,
    dateOnly: (value) => new Date(`${value}T12:00:00`),
    monthEnd: () => "2026-10-31",
    lateReminderMailto: () => "mailto:buyer@example.com",
    paymentStatusInMonth: () => "none",
    money,
  };
  const portfolioTable = context.window.PropertyDeskPropertyPortfolioTable.create({
    esc,
    money,
    paymentFrequencyLabel: () => "Monthly",
  });
  const portfolioModel = context.window.PropertyDeskPropertyPortfolioModel.create(dependencies);
  const feature = context.window.PropertyDeskPropertyViews.create({
    $: getElement,
    state,
    esc,
    portfolioTable,
    portfolioModel,
  });

  feature.renderProperties();

  const totals = getElement("properties-totals");
  const tableRows = getElement("properties-table").innerHTML;
  assert.ok(tableRows.indexOf("Buyer") < tableRows.indexOf("Tenant"));
  assert.match(totals.innerHTML, /\$130\.00/);
  assert.match(totals.innerHTML, /\$325\.00/);
  assert.match(totals.innerHTML, /\$1000\.00/);

  getElement("property-filter").value = "rental";
  feature.renderProperties();
  assert.match(totals.innerHTML, /\$80\.00/);
  assert.match(totals.innerHTML, /\$200\.00/);
  assert.ok(totals.innerHTML.includes("—"));
});

test("property portfolio workflow connects its model, table, and action routers", () => {
  const passed = {};
  const action = () => {};
  const context = vm.createContext({
    window: {
      PropertyDeskPropertyPortfolioTable: {
        create: (options) => { passed.tableOptions = options; return "table"; },
      },
      PropertyDeskPropertyPortfolioModel: {
        create: (options) => { passed.modelOptions = options; return "model"; },
      },
      PropertyDeskPropertyViews: {
        create: (options) => {
          passed.viewOptions = options;
          return { renderProperties: () => "properties", attachEvents: () => "filters" };
        },
      },
      PropertyDeskPropertyViewEvents: {
        create: (options) => {
          passed.actionOptions = options;
          return { attachEvents: () => "actions" };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", "property-portfolio-workflow.js"), "utf8"),
    context,
  );
  const workflow = context.window.PropertyDeskPropertyPortfolioWorkflow.create({
    esc: action, money: action, paymentFrequencyLabel: action,
    monthlyScheduledEstimate: action, accountBalance: action, amountDueSince: action,
    unpaidDueAccrualStart: action, todayIso: action, propertyAddress: action,
    monthStart: action, streetAddress: action, dateOnly: action, monthEnd: action,
    lateReminderMailto: action, paymentStatusInMonth: action, openPayment: action,
    editPropertyQuickNote: action, openPropertyDetails: action,
    resetAccountForm: action, populateFormOptions: action, openModal: action,
  });

  assert.equal(passed.viewOptions.portfolioTable, "table");
  assert.equal(passed.viewOptions.portfolioModel, "model");
  assert.equal(passed.actionOptions.openPayment, action);
  assert.equal(workflow.renderProperties(), "properties");
  assert.equal(workflow.attachPropertyViewEvents(), "filters");
  assert.equal(workflow.attachPropertyActionEvents(), "actions");
});

test("ledger entry workflow publishes an explicit payment and expense interface", () => {
  const calls = [];
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
      PropertyDeskPaymentEntryForm: { create: () => paymentActions },
      PropertyDeskExpenseEntryForm: { create: () => expenseActions },
    },
  });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", "ledger-entry-forms.js"), "utf8"),
    context,
  );
  const forms = context.window.PropertyDeskLedgerEntryForms.create({});

  assert.deepEqual(Object.keys(forms).sort(), [
    "attachEvents", "openExpense", "openPayment", "openPropertyPayment",
    "prefillPaymentAmount", "saveExpense", "savePayment", "updateAllocationPreview",
  ].sort());
  assert.equal(forms.updateAllocationPreview, paymentActions.updateAllocationPreview);
  assert.equal(forms.openExpense, expenseActions.openExpense);
  forms.attachEvents();
  assert.deepEqual(calls, ["payment events", "expense events"]);
});

test("property/account forms and ledger-entry forms expose separate workflows", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", "create-actions.js"), "utf8"),
    context,
  );
  loadPropertyAccountForms(context);
  loadLedgerEntryForms(context);
  const property = context.window.PropertyDeskPropertyAccountForms.create({});
  const ledger = context.window.PropertyDeskLedgerEntryForms.create({});
  const actions = context.window.PropertyDeskCreateActions.create({});
  for (const [feature, names] of [
    [property, ["resetPropertyForm", "resetAccountForm", "saveProperty", "saveAccount", "editAccount", "attachEvents"]],
    [ledger, ["savePayment", "saveExpense", "openPayment", "prefillPaymentAmount", "openPropertyPayment", "openExpense", "attachEvents"]],
    [actions, ["attachEvents"]],
  ]) {
    for (const name of names) assert.equal(typeof feature[name], "function", name);
  }
});

test("property and account forms report rejected saves without running success actions", async () => {
  const context = vm.createContext({ window: {} });
  loadPropertyAccountForms(context);
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
        insert: async () => { throw new Error("offline"); },
      }),
    },
  };
  const forms = context.window.PropertyDeskPropertyAccountForms.create({
    $,
    state,
    moneyInput: Number,
    todayIso: () => "2026-10-05",
    toast: (message) => messages.push(message),
    closeModal: () => assert.fail("rejected save must keep its form open"),
    fetchAll: async () => assert.fail("rejected save must not refresh"),
    populateFormOptions() {},
    openModal() {},
  });

  await assert.doesNotReject(forms.saveProperty({ preventDefault() {} }));
  await assert.doesNotReject(forms.saveAccount({ preventDefault() {} }));
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
    accounts: [{ id: "rental-1", property_id: "property-1", account_type: "rental" }],
    pendingCorrection: null,
    client: {
      from: () => ({ insert: async () => { throw new Error("offline"); } }),
      rpc: async () => { throw new Error("offline"); },
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
    ["payment", {
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
    }],
    ["expense", {
      property_id: "property-1",
      account_id: null,
      amount: 100,
      expense_date: "2026-10-05",
      category: "repair",
      payee: null,
      payment_method: "check",
      memo: "Plumbing repair",
    }],
  ]);
});

test("record-entry feature owns form event bindings and category hints", () => {
  const context = vm.createContext({ window: {} });
  loadPropertyAccountForms(context);
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
  const propertyForms = context.window.PropertyDeskPropertyAccountForms.create(formContext);
  const entryForms = context.window.PropertyDeskLedgerEntryForms.create(formContext);

  propertyForms.attachEvents(() => {});
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
        value: ({
          "expense-property": "property-1",
          "expense-category": "contractor_labor",
          "expense-payee": "Roofing Co",
          "expense-method": "check",
          "expense-amount": "425.50",
          "expense-date": "2026-10-04",
          "expense-memo": "Roof repair",
        })[id] || "",
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
      client: { from() { throw new Error("should not save"); } },
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
  assert.deepEqual(calls, ["Choose a rental account for a security deposit refund"]);
});

test("record-entry feature owns create actions and handles empty workspace states", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", "create-actions.js"), "utf8"),
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
