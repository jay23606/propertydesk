const assert = require("node:assert/strict");
const test = require("node:test");
const {
  loadLedgerEntryForms,
  loadPropertyAndAccountForms,
  ledgerEntryDependencies,
  accountFormDependencies,
  propertyFormDependencies,
} = require("./feature-test-helpers.cjs");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

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
    ...propertyFormDependencies(context),
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
    ...accountFormDependencies(context),
  });
  const entryForms = context.window.PropertyDeskLedgerEntryForms.create({
    ...formContext,
    ...ledgerEntryDependencies(context),
  });

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
    openAccountForProperty: (propertyId) =>
      calls.push(`open-account:${propertyId || "any"}`),
    documentRef: { querySelectorAll: (selector) => selectors[selector] || [] },
    todayIso: () => "2026-10-04",
    toast: (message) => calls.push(`toast:${message}`),
    populateFormOptions: () => calls.push("populate-options"),
    openModal: (id) => calls.push(`open:${id}`),
    openPayment: () => calls.push("open-payment"),
    openExpense: () => calls.push("open-expense"),
    navigate,
  });
  feature.attachCreateActionEvents();
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
    "open-account:any",
    "open-expense",
  ]);

  calls.length = 0;
  assert.deepEqual(Object.keys(feature), ["attachCreateActionEvents"]);
});
