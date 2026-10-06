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

test("opening a payment for an account prefills its scheduled installment without overwriting typed amount", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "payment-entry-view.js"),
      "utf8",
    ),
    context,
  );
  const handlers = new Map();
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
    ["payment-guidance", { innerHTML: "" }],
    ["income-category-wrap", { classList: { toggle() {} } }],
  ]);
  elements.get("payment-account").value = "account-1";
  const state = {
    accounts: [
      { id: "account-1", payment_amount: 647, account_type: "rental" },
    ],
    pendingCorrection: null,
  };
  const feature = context.window.PropertyDeskPaymentEntryView.create({
    $: (id) => {
      const element = elements.get(id);
      element.addEventListener = (event, handler) =>
        handlers.set(`${id}:${event}`, handler);
      return element;
    },
    state,
    moneyInput: Number,
    todayIso: () => "2026-10-04",
    populateFormOptions() {},
    fillSelect() {},
    prettyType: (value) => value,
    openModal() {},
    toast() {},
  });

  feature.attachEvents();
  feature.openPayment("account-1");
  assert.equal(elements.get("payment-amount").value, 647);
  elements.get("payment-amount").value = "300";
  handlers.get("payment-account:change")();
  assert.equal(elements.get("payment-amount").value, "300");
});

test("recording a loan payment does not invent principal or interest splits", async () => {
  const context = vm.createContext({ window: {} });
  loadLedgerEntryForms(context);

  const elements = new Map();
  const handlers = new Map();
  const element = (id) => {
    if (!elements.has(id)) {
      elements.set(id, {
        classList: { add() {}, remove() {}, toggle() {} },
        focus() {},
        reset() {},
        addEventListener(event, handler) {
          handlers.set(`${id}:${event}`, handler);
        },
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

  feature.attachEvents();
  await handlers.get("payment-form:submit")({ preventDefault() {} });

  assert.equal(state.savedPayment.amount, 550);
  assert.equal(state.savedPayment.income_category, "installment");
  assert.equal(state.savedPayment.principal_amount, 0);
  assert.equal(state.savedPayment.interest_amount, 0);
  assert.equal(state.savedPayment.unapplied_amount, 550);
});
