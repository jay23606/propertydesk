const assert = require("node:assert/strict");
const test = require("node:test");
const {
  loadLedgerEntryForms,
  ledgerEntryDependencies,
} = require("./feature-test-helpers.cjs");
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
  const captured = captureFormSubmissions(element, ["expense-form"]);
  const forms = context.window.PropertyDeskLedgerEntryForms.create({
    $: captured.$,
    ...ledgerEntryDependencies(context, state),
    moneyInput: Number,
    todayIso: () => "2026-10-05",
    toast: (message) => calls.push(`toast:${message}`),
    closeModal: () => calls.push("close-modal"),
    fetchAll: async () => calls.push("refresh"),
    fillSelect() {},
    populateFormOptions() {},
    prettyType: (value) => value,
    openModal() {},
    ...ledgerEntryDependencies(context, state),
  });

  forms.attachLedgerEntryFormEvents();
  await captured.handlers.get("expense-form:submit")({ preventDefault() {} });

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
  const captured = captureFormSubmissions(
    (id) => ({ value: values[id] || "" }),
    ["expense-form"],
  );
  const state = {
    accounts: [{ id: "loan-account", account_type: "note" }],
    pendingCorrection: null,
  };
  const forms = context.window.PropertyDeskLedgerEntryForms.create({
    $: captured.$,
    ...ledgerEntryDependencies(context, state),
    moneyInput: Number,
    todayIso: () => "2026-10-05",
    toast: (message) => calls.push(message),
    closeModal() {},
    fetchAll: async () => {},
    fillSelect() {},
    populateFormOptions() {},
    prettyType: (value) => value,
    openModal() {},
    ...ledgerEntryDependencies(context),
  });

  forms.attachLedgerEntryFormEvents();
  await captured.handlers.get("expense-form:submit")({ preventDefault() {} });
  assert.deepEqual(calls, [
    "Choose a rental account for a security deposit refund",
  ]);
});
