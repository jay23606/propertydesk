const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("backup workspace workflow owns backup dependency composition", () => {
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  assert.match(
    app,
    /PropertyDeskBackupWorkspaceWorkflow\.create\(\{[\s\S]*?workspaceTables: window\.PropertyDeskWorkspaceTables,[\s\S]*?loadAllPages: loadAllWorkspacePages,[\s\S]*?collectBackupAgreementFiles:[\s\S]*?window\.PropertyDeskBackupAgreementFiles\.collect,[\s\S]*?documentRepository: repositories\.documents,[\s\S]*?workflows: \{[\s\S]*?exporter:/,
  );
  assert.match(
    app,
    /exporter: \{\s*create: window\.PropertyDeskBackupExport\.create,\s*modules: \{ archive: window\.PropertyDeskBackupArchive \}/,
  );
  assert.match(
    app,
    /downloadBlob: window\.PropertyDeskDownloadUtils\.downloadBlob,[\s\S]*?zipUtils: window\.PropertyDeskZipUtils,/,
  );
  const workflow = fs.readFileSync(
    path.join(__dirname, "..", "features", "backup-workspace-workflow.js"),
    "utf8",
  );
  assert.doesNotMatch(
    workflow,
    /window\.PropertyDeskBackup(?:Utils|Records|Export)\.create/,
  );
  const exporter = fs.readFileSync(
    path.join(__dirname, "..", "features", "backup-export.js"),
    "utf8",
  );
  assert.doesNotMatch(exporter, /window\.PropertyDeskBackupArchive\.create/);
});

test("backup export requires an initialized runtime client", async () => {
  const context = vm.createContext({ window: {} });
  context.window.PropertyDeskBackupArchive = {
    create: () => ({ prepare: async () => assert.fail("backup must not run") }),
  };
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "backup-export.js"),
      "utf8",
    ),
    context,
  );
  const messages = [];
  let exportHandler;
  const button = {
    textContent: "Export backup",
    disabled: false,
    addEventListener(_event, handler) {
      exportHandler = handler;
    },
  };
  const feature = context.window.PropertyDeskBackupExport.create({
    $: () => button,
    state: { user: { id: "owner" } },
    isClientReady: () => false,
    modules: { archive: context.window.PropertyDeskBackupArchive },
    createBackup: () => assert.fail("backup must not be created before init"),
    todayIso: () => "2026-10-07",
    now: () => new Date("2026-10-08T12:00:00.000Z"),
    toast: (message) => messages.push(message),
    downloadBlob: () => assert.fail("download must not start before init"),
    zipUtils: {},
    loadBackupRecords: async () => ({}),
    collectBackupAgreementFiles: async () => ({}),
    documentRepository: {},
  });

  assert.equal(Object.isFrozen(feature), true);
  feature.attachBackupExportEvents();
  await exportHandler();

  assert.equal(button.disabled, false);
  assert.equal(button.textContent, "Export backup");
  assert.deepEqual(messages, [
    "Sign in before exporting your private records.",
  ]);
});

test("backup workspace workflow wires the manifest, record loader, and export action", () => {
  const calls = {};
  const attachEvents = () => {};
  const tables = ["pd_properties", "pd_documents"];
  const load = async () => ({ pd_properties: [], pd_documents: [] });
  const createBackup = () => ({ manifest: {}, data: {} });
  const archiveModule = { create() {} };
  const context = vm.createContext({
    window: {
      PropertyDeskBackupUtils: {
        create(options) {
          calls.utils = options;
          return { tables, createBackup };
        },
      },
      PropertyDeskBackupRecords: {
        create(options) {
          calls.records = options;
          return { load };
        },
      },
      PropertyDeskBackupExport: {
        create(options) {
          calls.exporter = options;
          return { attachBackupExportEvents: attachEvents };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "backup-workspace-workflow.js"),
      "utf8",
    ),
    context,
  );

  const now = () => new Date("2026-10-08T12:00:00.000Z");
  const dependencies = {
    $: () => null,
    state: { user: null },
    isClientReady: () => false,
    now,
    todayIso: () => "2026-10-07",
    toast: () => {},
    downloadBlob: () => {},
    zipUtils: { createZip: () => {} },
    workspaceTables: { properties: "pd_properties", documents: "pd_documents" },
    loadAllPages: async () => [],
    collectBackupAgreementFiles: async () => ({
      entries: [],
      includedFiles: [],
    }),
    documentRepository: {},
    workflows: {
      utils: context.window.PropertyDeskBackupUtils,
      records: context.window.PropertyDeskBackupRecords,
      exporter: {
        ...context.window.PropertyDeskBackupExport,
        modules: { archive: archiveModule },
      },
    },
  };
  const workflow =
    context.window.PropertyDeskBackupWorkspaceWorkflow.create(dependencies);

  assert.equal(calls.utils.workspaceTables, dependencies.workspaceTables);
  assert.deepEqual(calls.records.tables, tables);
  assert.equal(calls.records.loadAllPages, dependencies.loadAllPages);
  assert.equal(calls.exporter.createBackup, createBackup);
  assert.equal(calls.exporter.now, now);
  assert.equal(calls.exporter.isClientReady, dependencies.isClientReady);
  assert.equal(calls.exporter.loadBackupRecords, load);
  assert.equal(
    calls.exporter.collectBackupAgreementFiles,
    dependencies.collectBackupAgreementFiles,
  );
  assert.equal(
    calls.exporter.documentRepository,
    dependencies.documentRepository,
  );
  assert.equal(calls.exporter.modules.archive, archiveModule);
  assert.equal(workflow.attachBackupExportEvents, attachEvents);
  assert.deepEqual(Object.keys(workflow), ["attachBackupExportEvents"]);
});
