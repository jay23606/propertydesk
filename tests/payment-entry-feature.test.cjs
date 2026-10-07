const assert = require("node:assert/strict");
const test = require("node:test");
const {
  loadLedgerEntryForms,
  ledgerEntryDependencies,
} = require("./feature-test-helpers.cjs");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

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
  });

  feature.attachEvents();
  feature.openPayment("account-1");
  assert.equal(elements.get("payment-amount").value, 647);
  elements.get("payment-amount").value = "300";
  handlers.get("payment-account:change")();
  assert.equal(elements.get("payment-amount").value, "300");
});

test("property payment action targets the active account or asks for a choice", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "property-payment-action.js"),
      "utf8",
    ),
    context,
  );
  const calls = [];
  const messages = [];
  const state = {
    accounts: [
      { id: "current", property_id: "one", status: "active" },
      { id: "closed", property_id: "one", status: "closed" },
      { id: "other", property_id: "two", status: "active" },
      { id: "second", property_id: "three", status: "active" },
      { id: "third", property_id: "three", status: "active" },
    ],
  };
  const feature = context.window.PropertyDeskPropertyPaymentAction.create({
    state,
    toast: (message) => messages.push(message),
    openPayment: (...args) => calls.push(args),
  });

  feature.openPropertyPayment("one");
  feature.openPropertyPayment("three");
  feature.openPropertyPayment("missing");

  assert.deepEqual(calls, [
    ["current", "one"],
    [null, "three"],
  ]);
  assert.deepEqual(messages, [
    "Add an active account before recording a payment",
  ]);
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
    ...ledgerEntryDependencies(context),
  });

  feature.attachEvents();
  await handlers.get("payment-form:submit")({ preventDefault() {} });

  assert.equal(state.savedPayment.amount, 550);
  assert.equal(state.savedPayment.income_category, "installment");
  assert.equal(state.savedPayment.principal_amount, 0);
  assert.equal(state.savedPayment.interest_amount, 0);
  assert.equal(state.savedPayment.unapplied_amount, 550);
});
