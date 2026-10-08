const assert = require("node:assert/strict");
const test = require("node:test");
const { loadImportPreview } = require("./feature-test-helpers.cjs");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

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
  state.pendingImport.commitUnconfirmed = true;
  preview.updateImportCommitButton();
  assert.equal(
    getElement("import-commit").textContent,
    "Reload to check status",
  );
  assert.equal(getElement("import-commit").disabled, true);
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
