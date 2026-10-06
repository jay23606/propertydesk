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
    window: {
      PropertyDeskImportWorkflows: validators,
      PropertyDeskImportCommit: {
        create: () => ({ commitAccounts() {}, commitTransactions() {} }),
      },
      PropertyDeskCsvImportFile: { create: () => ({ attachEvents() {} }) },
    },
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
    createImportLookup() {},
  });
  assert.equal(typeof feature.attachEvents, "function");
  assert.deepEqual(Object.keys(feature), ["attachEvents"]);
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

test("CSV preview renderer receives only rendering dependencies", () => {
  const passed = {};
  const context = vm.createContext({
    window: {
      PropertyDeskImportCorrectionView: {
        create: () => ({ renderImportCorrections() {} }),
      },
      PropertyDeskImportPreviewRendering: {
        create: (options) => {
          passed.renderer = options;
          return { renderImportPreview() {}, updateImportCommitButton() {} };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "import-preview.js"),
      "utf8",
    ),
    context,
  );
  const dependencies = {
    $() {},
    state: {},
    selectImportRows() {},
    esc() {},
    openModal() {},
    closeModal() {},
    toast() {},
    unrelatedDependency() {},
  };
  const preview = context.window.PropertyDeskImportPreview.create(dependencies);

  assert.deepEqual(
    Object.keys(passed.renderer).sort(),
    ["$", "esc", "renderImportCorrections", "selectImportRows", "state"].sort(),
  );
  assert.equal(passed.renderer.selectImportRows, dependencies.selectImportRows);
  assert.equal(typeof preview.stageImport, "function");
});

test("import preview enforces batch size and rejects empty CSV data", () => {
  const context = vm.createContext({
    window: {
      PropertyDeskImportCorrectionView: {
        create: () => ({ renderImportCorrections() {} }),
      },
      PropertyDeskImportPreviewRendering: {
        create: () => ({
          renderImportPreview() {},
          updateImportCommitButton() {},
        }),
      },
    },
  });
  loadImportPreview(context);
  const preview = context.window.PropertyDeskImportPreview.create({
    state: { pendingImport: null },
  });

  assert.throws(
    () => preview.stageImport("Review", Array(501).fill({}), async () => {}),
    /limited to 500 rows/,
  );
  assert.throws(
    () => preview.stageImport("Review", [], async () => {}),
    /no importable rows/,
  );
});

test("CSV correction view escapes raw values and validation messages", () => {
  const context = vm.createContext({ window: {} });
  loadImportPreview(context);
  const elements = new Map();
  const $ = (id) => {
    if (!elements.has(id)) {
      elements.set(id, {
        innerHTML: "",
        classList: { toggle() {} },
      });
    }
    return elements.get(id);
  };
  const state = {
    pendingImport: {
      correctionKeys: ["party_name"],
      rawRows: [{ _source_row: 2, party_name: "<Oak House>" }],
      errors: [{ row: 2, message: "<Party is required>" }],
    },
  };
  const corrections = context.window.PropertyDeskImportCorrectionView.create({
    $,
    state,
    esc: (value) =>
      String(value ?? "")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;"),
  });

  corrections.renderImportCorrections();

  assert.match($("import-correction-head").innerHTML, /party name/);
  assert.match(
    $("import-correction-body").innerHTML,
    /value="&lt;Oak House&gt;"/,
  );
  assert.match(
    $("import-correction-body").innerHTML,
    /&lt;Party is required&gt;/,
  );
});

test("import workflow keeps file import handlers inside its event bindings", () => {
  const calls = [];
  const passed = {};
  const createImportLookup = () => ({});
  const accounts = { attachEvents: () => calls.push("account events") };
  const payments = { attachEvents: () => calls.push("payment events") };
  const expenses = { attachEvents: () => calls.push("expense events") };
  const context = vm.createContext({
    window: {
      PropertyDeskAccountImportPayload: { build() {} },
      PropertyDeskImportCommit: {
        create: () => ({ commitAccounts() {}, commitTransactions() {} }),
      },
      PropertyDeskTransactionImportWorkflow: { create() {} },
      PropertyDeskCsvImportFile: { create: () => ({ attachEvents() {} }) },
      PropertyDeskImportReview: {
        create: (options) => {
          passed.importReviewDependencies = options;
          return { stage() {} };
        },
      },
      PropertyDeskAccountImport: {
        create: (options) => {
          passed.account = options;
          return accounts;
        },
      },
      PropertyDeskPaymentImport: {
        create: (options) => {
          passed.payment = options;
          return payments;
        },
      },
      PropertyDeskExpenseImport: {
        create: (options) => {
          passed.expense = options;
          return expenses;
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "imports.js"),
      "utf8",
    ),
    context,
  );
  const dependencies = {
    $() {},
    state: {},
    stageImport() {},
    parseCSV() {},
    todayIso() {},
    validateAccountRows() {},
    validatePaymentRows() {},
    validateExpenseRows() {},
    createImportLookup,
    fetchAll() {},
    toast() {},
    unrelatedDependency() {},
  };
  const imports = context.window.PropertyDeskImportFeature.create(dependencies);

  assert.deepEqual(Object.keys(imports), ["attachEvents"]);
  assert.deepEqual(
    Object.keys(passed.account).sort(),
    [
      "$",
      "buildPayloads",
      "commitAccounts",
      "createFileWorkflow",
      "importReview",
      "parseCSV",
      "state",
      "todayIso",
      "validateAccountRows",
    ].sort(),
  );
  assert.deepEqual(
    Object.keys(passed.payment).sort(),
    [
      "$",
      "commitTransactions",
      "createFileWorkflow",
      "createImportLookup",
      "createTransactionImportWorkflow",
      "importReview",
      "parseCSV",
      "state",
      "validatePaymentRows",
    ].sort(),
  );
  assert.deepEqual(
    Object.keys(passed.expense).sort(),
    [
      "$",
      "commitTransactions",
      "createFileWorkflow",
      "createImportLookup",
      "createTransactionImportWorkflow",
      "importReview",
      "parseCSV",
      "state",
      "validateExpenseRows",
    ].sort(),
  );
  assert.equal(passed.account.importReview, passed.payment.importReview);
  assert.equal(passed.payment.importReview, passed.expense.importReview);
  assert.equal(passed.payment.createImportLookup, createImportLookup);
  assert.equal(passed.expense.createImportLookup, createImportLookup);
  assert.deepEqual(Object.keys(passed.importReviewDependencies), [
    "stageImport",
  ]);
  imports.attachEvents();
  assert.deepEqual(calls, [
    "account events",
    "payment events",
    "expense events",
  ]);
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
  const workflow = context.window.PropertyDeskTransactionImportWorkflow.create({
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

test("CSV import workflow stages preview before attaching review and file handlers", () => {
  const sequence = [];
  const passed = {};
  const validators = {
    validateAccountRows() {},
    validatePaymentRows() {},
    validateExpenseRows() {},
  };
  const importUtils = {
    parseCSV() {},
    createImportLookup() {},
    selectImportRows() {},
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
      PropertyDeskImportUtils: importUtils,
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
  assert.equal(passed.importFeature.parseCSV, importUtils.parseCSV);
  assert.equal(
    passed.importFeature.createImportLookup,
    importUtils.createImportLookup,
  );
  assert.equal(
    passed.importFeature.validateAccountRows,
    validators.validateAccountRows,
  );
  assert.equal(
    passed.importFeature.validatePaymentRows,
    validators.validatePaymentRows,
  );
  assert.equal(
    passed.importFeature.validateExpenseRows,
    validators.validateExpenseRows,
  );
  assert.equal(
    passed.previewEvents.selectImportRows,
    importUtils.selectImportRows,
  );
  assert.equal(
    passed.previewEvents.renderImportPreview instanceof Function,
    true,
  );
  const source = fs.readFileSync(
    path.join(__dirname, "..", "features", "csv-import-workflow.js"),
    "utf8",
  );
  assert.match(source, /attachEvents: attachImportEvents/);
  assert.doesNotMatch(source, /importFeature\./);
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
  const fileHandlers = new Map();
  const elements = formElements();
  let lookupBuilds = 0;
  const feature = context.window.PropertyDeskImportFeature.create({
    $: (id) => {
      const element = elements(id);
      element.addEventListener = (event, handler) =>
        fileHandlers.set(`${id}:${event}`, handler);
      return element;
    },
    state,
    stageImport: (title, rows, commit, note, report) =>
      staged.push({ title, rows, commit, note, report }),
    parseCSV: (content) => JSON.parse(content),
    createImportLookup(properties, accounts) {
      lookupBuilds++;
      return context.window.PropertyDeskImportUtils.createImportLookup(
        properties,
        accounts,
      );
    },
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
  feature.attachEvents();
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
  const feature = context.window.PropertyDeskImportFeature.create({
    $: element,
    state,
    stageImport(title, rows, commit, note, report) {
      state.pendingImport = { title, rows, commit, note, ...report };
    },
    parseCSV: () => [{}],
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

  feature.attachEvents();
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
