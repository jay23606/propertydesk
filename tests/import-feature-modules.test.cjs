const assert = require("node:assert/strict");
const test = require("node:test");
const {
  loadImportFeatures,
  loadImportPreview,
  formElements,
} = require("./feature-test-helpers.cjs");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("CSV import feature loads as an isolated browser module", () => {
  const validators = Object.freeze({ validateAccountRows() {} });
  const context = vm.createContext({
    window: { PropertyDeskImportWorkflows: validators },
  });
  loadImportPreview(context);
  loadImportFeatures(context);

  assert.equal(context.window.PropertyDeskImportWorkflows, validators);
  const preview = context.window.PropertyDeskImportPreview.create({});
  const previewEvents = context.window.PropertyDeskImportPreviewEvents.create(
    {},
  );
  const handlers = new Map();
  const feature = context.window.PropertyDeskImportFeature.create({
    $: (id) => ({
      addEventListener: (event, handler) =>
        handlers.set(`${id}:${event}`, handler),
    }),
    stageImport: preview.stageImport,
  });
  assert.equal(typeof feature.attachEvents, "function");
  assert.equal(typeof feature.importAccounts, "function");
  assert.equal(typeof feature.importExpenses, "function");
  assert.equal(typeof feature.importPayments, "function");
  assert.equal(typeof previewEvents.attachEvents, "function");
  feature.attachEvents();
  assert.deepEqual(
    [...handlers.keys()],
    [
      "import-file:change",
      "payment-import-file:change",
      "expense-import-file:change",
    ],
  );
});

test("transaction import workflow publishes explicit payment and expense actions", () => {
  const calls = [];
  const payments = {
    importPayments: () => "payments",
    attachEvents: () => calls.push("payment events"),
  };
  const expenses = {
    importExpenses: () => "expenses",
    attachEvents: () => calls.push("expense events"),
  };
  const context = vm.createContext({
    window: {
      PropertyDeskPaymentImport: { create: () => payments },
      PropertyDeskExpenseImport: { create: () => expenses },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "transaction-imports.js"),
      "utf8",
    ),
    context,
  );
  const imports = context.window.PropertyDeskTransactionImports.create({});

  assert.deepEqual(
    Object.keys(imports).sort(),
    ["attachEvents", "importExpenses", "importPayments"].sort(),
  );
  assert.equal(imports.importPayments, payments.importPayments);
  assert.equal(imports.importExpenses, expenses.importExpenses);
  imports.attachEvents();
  assert.deepEqual(calls, ["payment events", "expense events"]);
});

test("import workflow publishes explicit account, payment, and expense actions", () => {
  const calls = [];
  const accounts = {
    importAccounts: () => "accounts",
    attachEvents: () => calls.push("account events"),
  };
  const transactions = {
    importPayments: () => "payments",
    importExpenses: () => "expenses",
    attachEvents: () => calls.push("transaction events"),
  };
  const context = vm.createContext({
    window: {
      PropertyDeskAccountImport: { create: () => accounts },
      PropertyDeskTransactionImports: { create: () => transactions },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "imports.js"),
      "utf8",
    ),
    context,
  );
  const imports = context.window.PropertyDeskImportFeature.create({});

  assert.deepEqual(
    Object.keys(imports).sort(),
    [
      "attachEvents",
      "importAccounts",
      "importExpenses",
      "importPayments",
    ].sort(),
  );
  assert.equal(imports.importAccounts, accounts.importAccounts);
  assert.equal(imports.importPayments, transactions.importPayments);
  assert.equal(imports.importExpenses, transactions.importExpenses);
  imports.attachEvents();
  assert.deepEqual(calls, ["account events", "transaction events"]);
});

test("CSV import workflow stages preview before attaching review and file handlers", () => {
  const sequence = [];
  const passed = {};
  const validators = {
    validateAccountRows() {},
    validatePaymentRows() {},
    validateExpenseRows() {},
  };
  const context = vm.createContext({
    window: {
      PropertyDeskImportPreview: {
        create: () => {
          sequence.push("preview");
          return {
            stageImport: () => {},
            renderImportPreview: () => {},
            updateImportCommitButton: () => {},
          };
        },
      },
      PropertyDeskImportPreviewEvents: {
        create: (options) => {
          sequence.push("preview events");
          passed.previewEvents = options;
          return { attachEvents: () => sequence.push("attach preview events") };
        },
      },
      PropertyDeskImportFeature: {
        create: (options) => {
          sequence.push("import feature");
          passed.importFeature = options;
          return { attachEvents: () => sequence.push("attach import feature") };
        },
      },
      PropertyDeskImportWorkflows: validators,
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "csv-import-workflow.js"),
      "utf8",
    ),
    context,
  );
  const stage = () => {};
  const workflow = context.window.PropertyDeskCsvImportWorkflow.create({
    stageImport: stage,
  });
  workflow.attachEvents();

  assert.deepEqual(sequence, [
    "preview",
    "preview events",
    "import feature",
    "attach preview events",
    "attach import feature",
  ]);
  assert.equal(typeof passed.importFeature.stageImport, "function");
  assert.equal(passed.importFeature.validateAccountRows, validators.validateAccountRows);
  assert.equal(passed.importFeature.validatePaymentRows, validators.validatePaymentRows);
  assert.equal(passed.importFeature.validateExpenseRows, validators.validateExpenseRows);
  assert.equal(
    passed.previewEvents.renderImportPreview instanceof Function,
    true,
  );
});

test("payment and expense CSV importers save their own validated transaction payloads", async () => {
  const context = vm.createContext({ window: {} });
  loadImportFeatures(context);
  const property = {
    id: "property-1",
    name: "Main House",
    address: "10 Main St",
  };
  const account = {
    id: "account-1",
    property_id: property.id,
    name: "Monthly rent",
  };
  const state = {
    properties: [property],
    accounts: [account],
    expenses: [],
    payments: [],
    client: {
      async rpc(name, args) {
        calls.push({ name, args });
        return { data: { rows_accepted: 1 }, error: null };
      },
    },
  };
  const calls = [];
  const staged = [];
  const feature = context.window.PropertyDeskTransactionImports.create({
    $: formElements(),
    state,
    stageImport: (title, rows, commit, note, report) =>
      staged.push({ title, rows, commit, note, report }),
    parseCSV: (content) => JSON.parse(content),
    validateExpenseRows: (rows) => ({
      valid: rows,
      total: rows.length,
      errors: [],
    }),
    validatePaymentRows: (rows) => ({
      valid: rows,
      total: rows.length,
      errors: [],
    }),
    fetchAll: async () => {},
    toast() {},
  });
  const expense = {
    property_name: property.name,
    property_address: property.address,
    account_name: account.name,
    expense_date: "2026-10-04",
    amount: 45,
    category: "repairs",
    payee: "Plumber",
    payment_method: "check",
    memo: "Leak repair",
  };
  await feature.importExpenses({
    name: "expenses.csv",
    text: async () => JSON.stringify([expense]),
  });
  await staged[0].commit(staged[0].rows, { total: 1 });
  assert.equal(staged[0].title, "Review expense import");
  assert.equal(calls[0].name, "pd_import_propertydesk_transactions");
  assert.equal(calls[0].args.p_kind, "expenses");
  assert.equal(calls[0].args.p_rows[0].property_id, property.id);
  assert.equal(calls[0].args.p_rows[0].account_id, account.id);
  assert.equal(calls[0].args.p_rows[0].amount, 45);
  assert.equal(calls[0].args.p_source_name, "expenses.csv");

  const payment = {
    property_name: property.name,
    property_address: property.address,
    account_name: account.name,
    received_date: "2026-10-05",
    amount: 825,
    income_category: "rent",
    payment_method: "cash",
    principal_amount: 0,
    interest_amount: 0,
    fee_amount: 0,
    escrow_amount: 0,
    unapplied_amount: 0,
    memo: "October rent",
  };
  await feature.importPayments({
    name: "payments.csv",
    text: async () => JSON.stringify([payment]),
  });
  await staged[1].commit(staged[1].rows, { total: 1 });
  assert.equal(staged[1].title, "Review payment import");
  assert.equal(calls[1].name, "pd_import_propertydesk_transactions");
  assert.equal(calls[1].args.p_kind, "payments");
  assert.equal(calls[1].args.p_rows[0].account_id, account.id);
  assert.equal(calls[1].args.p_rows[0].amount, 825);
  assert.equal(calls[1].args.p_rows[0].received_date, "2026-10-05");
  assert.equal(calls[1].args.p_source_name, "payments.csv");
});

test("CSV import preview escapes staged data and excludes possible duplicates by default", () => {
  const context = vm.createContext({ window: {} });
  loadImportPreview(context);
  const elements = new Map();
  const getElement = (id) => {
    if (!elements.has(id)) {
      elements.set(id, {
        checked: false,
        disabled: false,
        textContent: "",
        innerHTML: "",
        classList: { toggle() {} },
      });
    }
    return elements.get(id);
  };
  const state = { pendingImport: null };
  const opened = [];
  const preview = context.window.PropertyDeskImportPreview.create({
    $: getElement,
    state,
    selectImportRows: (rows, includeDuplicates) =>
      rows.filter((row) => includeDuplicates || !row._possible_duplicate),
    esc: (value) =>
      String(value ?? "")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;"),
    openModal: (id) => opened.push(id),
  });

  preview.stageImport(
    "Review payment import",
    [
      { property_name: "<Oak House>" },
      { property_name: "Possible match", _possible_duplicate: true },
    ],
    async () => {},
    "",
    { total: 2 },
  );

  assert.equal(state.pendingImport.title, "Review payment import");
  assert.equal(
    getElement("import-preview-title").textContent,
    "Review payment import",
  );
  assert.match(
    getElement("import-preview-summary").textContent,
    /2 CSV rows · 2 valid · 1 possible duplicate/,
  );
  assert.match(
    getElement("import-preview-body").innerHTML,
    /&lt;Oak House&gt;/,
  );
  assert.equal(getElement("import-commit").textContent, "Import 1 row");
  assert.equal(getElement("import-commit").disabled, false);
  assert.deepEqual(opened, ["import-preview-modal"]);
});

test("import preview event router corrects rows, updates duplicate selection, and commits approved rows", async () => {
  const context = vm.createContext({ window: {} });
  loadImportPreview(context);
  const handlers = new Map();
  const elements = new Map();
  const getElement = (id) => {
    if (!elements.has(id)) {
      elements.set(id, {
        checked: false,
        disabled: false,
        textContent: "",
        addEventListener: (event, handler) =>
          handlers.set(`${id}:${event}`, handler),
      });
    }
    return elements.get(id);
  };
  const state = {
    pendingImport: {
      rows: [],
      rawRows: [{ _source_row: 2, amount: "bad" }],
      revalidate: (rawRows) => ({
        valid: [{ amount: rawRows[0].amount }],
        errors: [],
        total: 1,
      }),
      commit: async (rows) => calls.push(["commit", rows]),
    },
  };
  const calls = [];
  const events = context.window.PropertyDeskImportPreviewEvents.create({
    $: getElement,
    state,
    selectImportRows: (rows) => rows,
    renderImportPreview: () => calls.push("render"),
    updateImportCommitButton: () => calls.push("update-button"),
    closeModal: (id) => calls.push(`close:${id}`),
  });
  events.attachEvents();

  await handlers.get("import-correction-body:change")({
    target: {
      closest: (selector) =>
        selector === "[data-import-correction]"
          ? { dataset: { row: "2", column: "amount" }, value: "25" }
          : null,
    },
  });
  await handlers.get("import-include-duplicates:change")();
  await handlers.get("import-commit:click")();

  assert.equal(state.pendingImport, null);
  assert.deepEqual(calls, [
    "render",
    "update-button",
    ["commit", [{ amount: "25" }]],
    "close:import-preview-modal",
    "update-button",
  ]);
});

test("an unconfirmed import disables retry and directs the owner to verify the receipt", async () => {
  const context = vm.createContext({ window: {} });
  loadImportPreview(context);
  const elements = new Map();
  const handlers = new Map();
  const $ = (id) => {
    if (!elements.has(id)) {
      elements.set(id, {
        checked: false,
        disabled: false,
        textContent: "",
        innerHTML: "",
        classList: { toggle() {} },
        addEventListener(event, handler) {
          handlers.set(`${id}:${event}`, handler);
        },
      });
    }
    return elements.get(id);
  };
  const state = { pendingImport: null };
  const closed = [];
  const preview = context.window.PropertyDeskImportPreview.create({
    $,
    state,
    selectImportRows: (rows) => rows,
    esc: String,
    openModal() {},
    closeModal: (id) => closed.push(id),
  });
  const previewEvents = context.window.PropertyDeskImportPreviewEvents.create({
    $,
    state,
    selectImportRows: (rows) => rows,
    renderImportPreview: preview.renderImportPreview,
    updateImportCommitButton: preview.updateImportCommitButton,
    closeModal: (id) => closed.push(id),
  });
  preview.stageImport(
    "Review payment import",
    [{ id: "row-1" }],
    async () => {
      throw new Error("workspace refresh failed");
    },
    "",
    { total: 1 },
  );
  previewEvents.attachEvents();

  await assert.doesNotReject(handlers.get("import-commit:click")());

  assert.match(
    $("import-preview-summary").textContent,
    /status couldn't be confirmed/i,
  );
  assert.match(
    $("import-preview-summary").textContent,
    /Reports import history/i,
  );
  assert.equal($("import-commit").disabled, true);
  assert.equal($("import-commit").textContent, "Reload to check status");
  assert.equal(state.pendingImport.commitUnconfirmed, true);
  assert.deepEqual(closed, []);
});
