const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");

test("CSV import feature loads as an isolated browser module", () => {
  const validators = Object.freeze({ validateAccountRows() {} });
  const context = vm.createContext({
    window: { PropertyDeskImportWorkflows: validators },
  });
  const source = fs.readFileSync(
    path.join(__dirname, "..", "features", "imports.js"),
    "utf8",
  );

  vm.runInContext(source, context);

  assert.equal(context.window.PropertyDeskImportWorkflows, validators);
  const feature = context.window.PropertyDeskImportFeature.create({});
  assert.equal(typeof feature.attachEvents, "function");
  assert.equal(typeof feature.importAccounts, "function");
  assert.equal(typeof feature.importExpenses, "function");
  assert.equal(typeof feature.importPayments, "function");
});

test("property and account detail views expose focused render actions", () => {
  const context = vm.createContext({ window: {} });
  const source = fs.readFileSync(
    path.join(__dirname, "..", "features", "details.js"),
    "utf8",
  );
  vm.runInContext(source, context);

  const feature = context.window.PropertyDeskDetailViews.create({});
  assert.equal(typeof feature.openPropertyDetails, "function");
  assert.equal(typeof feature.openAccountDetails, "function");
});

test("record-entry module exposes property, account, and transaction workflows", () => {
  const context = vm.createContext({ window: {} });
  const source = fs.readFileSync(
    path.join(__dirname, "..", "features", "record-forms.js"),
    "utf8",
  );
  vm.runInContext(source, context);

  const feature = context.window.PropertyDeskRecordForms.create({});
  for (const action of [
    "resetPropertyForm",
    "resetAccountForm",
    "saveProperty",
    "saveAccount",
    "savePayment",
    "saveExpense",
    "editAccount",
    "openPayment",
    "openPropertyPayment",
    "openExpense",
    "correctTransaction",
  ]) {
    assert.equal(typeof feature[action], "function", action);
  }
});

test("recording a loan payment does not invent principal or interest splits", async () => {
  const context = vm.createContext({ window: {} });
  const source = fs.readFileSync(
    path.join(__dirname, "..", "features", "record-forms.js"),
    "utf8",
  );
  vm.runInContext(source, context);

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
  const feature = context.window.PropertyDeskRecordForms.create({
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
  const source = fs.readFileSync(
    path.join(__dirname, "..", "features", "imports.js"),
    "utf8",
  );
  vm.runInContext(source, context);

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
    parseCSV: () => [{}],
    selectImportRows: (rows) => rows,
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
