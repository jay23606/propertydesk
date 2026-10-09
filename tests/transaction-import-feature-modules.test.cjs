const assert = require("node:assert/strict");
const test = require("node:test");
const {
  loadImportFeatures,
  loadImportPreview,
  importPreviewModules,
  importFeatureModules,
  formElements,
} = require("./feature-test-helpers.cjs");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
function overrideImportStage(context, stageImport) {
  const preview = context.window.PropertyDeskImportPreview;
  context.window.PropertyDeskImportPreview = {
    ...preview,
    create(options) {
      return { ...preview.create(options), stageImport };
    },
  };
}

test("transaction import feature shares setup without mixing payment and expense inputs", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "features", "transaction-import-feature.js"),
    "utf8",
  );
  assert.doesNotMatch(
    source,
    /window\.PropertyDesk(?:Payment|Expense)Import\.create/,
  );
  const passed = {};
  const paymentEvents = () => {};
  const expenseEvents = () => {};
  const paymentImportModule = {
    create: (options) => {
      passed.payment = options;
      return { attachEvents: paymentEvents };
    },
  };
  const expenseImportModule = {
    create: (options) => {
      passed.expense = options;
      return { attachEvents: expenseEvents };
    },
  };
  const context = vm.createContext({
    window: {},
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "transaction-import-feature.js"),
      "utf8",
    ),
    context,
  );
  const shared = {
    $() {},
    createImportLookup() {},
    createFileWorkflow() {},
    createTransactionImportWorkflow() {},
    unusedSharedValue: true,
  };
  const payment = {
    state: {},
    parseCSV() {},
    validatePaymentRows() {},
    commitTransactions() {},
    importReview: {},
    unusedPaymentValue: true,
  };
  const expense = {
    state: {},
    parseCSV() {},
    validateExpenseRows() {},
    commitTransactions() {},
    importReview: {},
    unusedExpenseValue: true,
  };
  const feature = context.window.PropertyDeskTransactionImportFeature.create({
    shared,
    payment,
    expense,
    modules: {
      payment: paymentImportModule,
      expense: expenseImportModule,
    },
  });

  assert.equal(Object.isFrozen(feature), true);
  assert.equal(passed.payment.$, shared.$);
  assert.equal(passed.expense.$, shared.$);
  assert.equal(passed.payment.state, payment.state);
  assert.equal(passed.expense.state, expense.state);
  assert.equal(passed.payment.validatePaymentRows, payment.validatePaymentRows);
  assert.equal(passed.expense.validateExpenseRows, expense.validateExpenseRows);
  assert.equal(
    passed.payment.createTransactionImportWorkflow,
    shared.createTransactionImportWorkflow,
  );
  assert.equal(
    passed.expense.createTransactionImportWorkflow,
    shared.createTransactionImportWorkflow,
  );
  assert.equal("validateExpenseRows" in passed.payment, false);
  assert.equal("validatePaymentRows" in passed.expense, false);
  assert.equal("unusedSharedValue" in passed.payment, false);
  assert.equal("unusedSharedValue" in passed.expense, false);
  assert.equal("unusedPaymentValue" in passed.payment, false);
  assert.equal("unusedExpenseValue" in passed.expense, false);
  assert.equal(feature.attachPaymentEvents, paymentEvents);
  assert.equal(feature.attachExpenseEvents, expenseEvents);
});

test("shared import review stages validation and maps only approved rows before commit", async () => {
  const context = vm.createContext({ window: {} });
  loadImportFeatures(context);
  const staged = [];
  const validationInputs = [];
  const commitCalls = [];
  const review = context.window.PropertyDeskImportReview.create({
    stageImport: (...args) => staged.push(args),
  });
  const file = { name: "accounts.csv" };
  const rows = [{ name: "valid" }, { name: "invalid" }];
  const validateRows = (sourceRows) => {
    validationInputs.push(sourceRows);
    return {
      valid: sourceRows.filter((row) => row.name === "valid"),
      total: sourceRows.length,
      errors: [{ row: 3, message: "Missing property" }],
    };
  };

  review.stage({
    title: "Review account import",
    rows,
    validateRows,
    correctionKeys: ["name"],
    file,
    mapRows: async (approvedRows) =>
      approvedRows.map((row) => ({ account_name: row.name })),
    commit: async (payload) => commitCalls.push(payload),
  });

  const [title, validRows, commit, note, report] = staged[0];
  assert.equal(title, "Review account import");
  assert.deepEqual(validRows, [{ name: "valid" }]);
  assert.equal(note, "");
  assert.equal(report.total, 2);
  assert.equal(report.errors[0].row, 3);
  assert.equal(report.errors[0].message, "Missing property");
  assert.equal(report.rawRows, rows);
  assert.deepEqual(Array.from(report.correctionKeys), ["name"]);
  assert.equal(report.revalidate, validateRows);
  assert.deepEqual(validationInputs, [rows]);
  assert.deepEqual(report.revalidate([{ name: "valid" }]).valid, [
    { name: "valid" },
  ]);

  await commit(validRows, { total: 2 });

  assert.equal(commitCalls.length, 1);
  assert.deepEqual(commitCalls[0].rows, [{ account_name: "valid" }]);
  assert.equal(commitCalls[0].file, file);
  assert.equal(commitCalls[0].total, 2);
});

test("transaction import workflow shares file staging and batch commit wiring", async () => {
  const context = vm.createContext({ window: {} });
  loadImportFeatures(context);
  const staged = [];
  const commitCalls = [];
  const fileOptions = [];
  const validateRows = () => {};
  const mapRows = () => [];
  const importReview = {
    stage: (options) => staged.push(options),
  };
  const commitTransactions = (options) => commitCalls.push(options);
  context.window.PropertyDeskTransactionImportWorkflow.create({
    $: (id) => id,
    parseCSV: () => [],
    importReview,
    createFileWorkflow(options) {
      fileOptions.push(options);
      return { attachEvents() {} };
    },
    inputId: "payment-import-file",
    emptyMessage: "No payment rows",
    failurePrefix: "Review payment import: ",
    title: "Review payment import",
    validateRows,
    correctionKeys: ["amount"],
    mapRows,
    commitTransactions,
    kind: "payments",
    label: "payment",
  });
  const file = { name: "payments.csv" };
  const rows = [{ amount: 100 }];
  fileOptions[0].handleRows(file, rows);

  assert.equal(fileOptions[0].input, "payment-import-file");
  assert.equal(fileOptions[0].status, "import-status");
  assert.equal(fileOptions[0].parseCSV instanceof Function, true);
  assert.equal(fileOptions[0].emptyMessage, "No payment rows");
  assert.equal(fileOptions[0].failurePrefix, "Review payment import: ");
  assert.equal(staged[0].title, "Review payment import");
  assert.equal(staged[0].rows, rows);
  assert.equal(staged[0].validateRows, validateRows);
  assert.equal(staged[0].correctionKeys[0], "amount");
  assert.equal(staged[0].file, file);
  assert.equal(staged[0].mapRows, mapRows);

  const payload = [{ account_id: "account-1", amount: 100 }];
  await staged[0].commit({ rows: payload, file, total: 1 });
  assert.deepEqual(JSON.parse(JSON.stringify(commitCalls)), [
    {
      kind: "payments",
      rows: payload,
      sourceName: "payments.csv",
      total: 1,
      label: "payment",
    },
  ]);
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
  const baseCreateImportLookup =
    context.window.PropertyDeskImportRows.createImportLookup;
  context.window.PropertyDeskCsvParser = {
    parseCSV: (content) => JSON.parse(content),
  };
  context.window.PropertyDeskImportRows = {
    ...context.window.PropertyDeskImportRows,
    createImportLookup(properties, accounts) {
      lookupBuilds++;
      return baseCreateImportLookup(properties, accounts);
    },
  };
  context.window.PropertyDeskImportWorkflows = {
    validateAccountRows: () => ({ valid: [], total: 0, errors: [] }),
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
  };
  const calls = [];
  const staged = [];
  const fileHandlers = new Map();
  const elements = formElements();
  let lookupBuilds = 0;
  overrideImportStage(context, (title, rows, commit, note, report) =>
    staged.push({ title, rows, commit, note, report }),
  );
  const feature = context.window.PropertyDeskImportFeature.create({
    $: (id) => {
      const element = elements(id);
      element.addEventListener = (event, handler) =>
        fileHandlers.set(`${id}:${event}`, handler);
      return element;
    },
    state,
    repository: context.window.PropertyDeskImportRepository.create({
      getClient: () => state.client,
    }),
    fetchAll: async () => {},
    toast() {},
    refreshWorkspace: async () => true,
    modules: importFeatureModules(context),
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
  feature.attachPaymentEvents();
  feature.attachExpenseEvents();
  await fileHandlers.get("expense-import-file:change")({
    target: {
      files: [
        {
          name: "expenses.csv",
          text: async () => JSON.stringify([expense]),
        },
      ],
    },
  });
  await staged[0].commit(staged[0].rows, { total: 1 });
  assert.equal(staged[0].title, "Review expense import");
  assert.equal(calls[0].name, "pd_import_propertydesk_transactions");
  assert.equal(calls[0].args.p_kind, "expenses");
  assert.equal(calls[0].args.p_rows[0].property_id, property.id);
  assert.equal(calls[0].args.p_rows[0].account_id, account.id);
  assert.equal(calls[0].args.p_rows[0].amount, 45);
  assert.equal(calls[0].args.p_source_name, "expenses.csv");
  assert.equal(lookupBuilds, 1);

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
  await fileHandlers.get("payment-import-file:change")({
    target: {
      files: [
        {
          name: "payments.csv",
          text: async () => JSON.stringify([payment]),
        },
      ],
    },
  });
  await staged[1].commit(staged[1].rows, { total: 1 });
  assert.equal(staged[1].title, "Review payment import");
  assert.equal(calls[1].name, "pd_import_propertydesk_transactions");
  assert.equal(calls[1].args.p_kind, "payments");
  assert.equal(calls[1].args.p_rows[0].account_id, account.id);
  assert.equal(calls[1].args.p_rows[0].amount, 825);
  assert.equal(calls[1].args.p_rows[0].received_date, "2026-10-05");
  assert.equal(calls[1].args.p_source_name, "payments.csv");
  assert.equal(lookupBuilds, 2);

  state.accounts = [];
  await assert.rejects(
    staged[1].commit(staged[1].rows, { total: 1 }),
    /account is no longer available/i,
  );
  assert.equal(calls.length, 2);
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
    modules: importPreviewModules(context),
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

test("a saved import with refresh failure explains the save and still blocks retry", async () => {
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
  const preview = context.window.PropertyDeskImportPreview.create({
    $,
    state,
    selectImportRows: (rows) => rows,
    esc: String,
    openModal() {},
    closeModal() {},
    modules: importPreviewModules(context),
  });
  const previewEvents = context.window.PropertyDeskImportPreviewEvents.create({
    $,
    state,
    selectImportRows: (rows) => rows,
    renderImportPreview: preview.renderImportPreview,
    updateImportCommitButton: preview.updateImportCommitButton,
    closeModal() {},
  });
  preview.stageImport(
    "Review payment import",
    [{ id: "row-1" }],
    async () => {
      const error = new Error("Workspace refresh failed after save.");
      error.importPersisted = true;
      throw error;
    },
    "",
    { total: 1 },
  );
  previewEvents.attachEvents();

  await assert.doesNotReject(handlers.get("import-commit:click")());

  assert.match($("import-preview-summary").textContent, /Import was saved/i);
  assert.match(
    $("import-preview-summary").textContent,
    /reload the workspace/i,
  );
  assert.equal($("import-commit").disabled, true);
  assert.equal($("import-commit").textContent, "Reload to check status");
  assert.equal(state.pendingImport.commitUnconfirmed, true);
});

test("CSV imports report a real zero accepted by the server as zero", async () => {
  const context = vm.createContext({ window: {} });
  loadImportFeatures(context);

  const elements = new Map();
  const fileHandlers = new Map();
  const element = (id) => {
    if (!elements.has(id)) {
      elements.set(id, {
        classList: { add() {}, remove() {}, toggle() {} },
        checked: false,
        disabled: false,
        textContent: "",
        value: "",
        addEventListener: (event, handler) =>
          fileHandlers.set(`${id}:${event}`, handler),
      });
    }
    return elements.get(id);
  };
  const state = {
    accounts: [],
    properties: [],
    client: { rpc: async () => ({ data: { rows_accepted: 0 }, error: null }) },
  };
  context.window.PropertyDeskCsvParser = { parseCSV: () => [{}] };
  context.window.PropertyDeskImportWorkflows = {
    validateAccountRows: () => ({
      valid: [{ account_name: "Test" }],
      errors: [],
      total: 1,
    }),
    validateExpenseRows() {},
    validatePaymentRows() {},
  };
  overrideImportStage(context, (title, rows, commit, note, report) => {
    state.pendingImport = { title, rows, commit, note, ...report };
  });
  const feature = context.window.PropertyDeskImportFeature.create({
    $: element,
    state,
    repository: context.window.PropertyDeskImportRepository.create({
      getClient: () => state.client,
    }),
    esc: (value) => String(value ?? ""),
    todayIso: () => "2026-10-04",
    openModal() {},
    closeModal() {},
    fetchAll: async () => {},
    toast() {},
    refreshWorkspace: async () => true,
    modules: importFeatureModules(context),
  });

  feature.attachAccountEvents();
  await fileHandlers.get("import-file:change")({
    target: { files: [{ name: "accounts.csv", text: async () => "" }] },
  });
  await state.pendingImport.commit(
    state.pendingImport.rows,
    state.pendingImport,
  );

  assert.match(
    element("import-status").textContent,
    /Imported 0 accounts; 1 row was skipped/,
  );
});
