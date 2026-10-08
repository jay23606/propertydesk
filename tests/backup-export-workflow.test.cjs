const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("backup workspace workflow owns backup dependency composition", () => {
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  assert.match(
    app,
    /PropertyDeskBackupWorkspaceWorkflow\.create\(\{[\s\S]*?workspaceTables: window\.PropertyDeskWorkspaceTables,[\s\S]*?loadAllPages: loadAllWorkspacePages,[\s\S]*?collectBackupAgreementFiles:[\s\S]*?window\.PropertyDeskBackupAgreementFiles\.collect,[\s\S]*?documentRepository: repositories\.documents,/,
  );
  assert.match(
    app,
    /downloadBlob: window\.PropertyDeskDownloadUtils\.downloadBlob,[\s\S]*?zipUtils: window\.PropertyDeskZipUtils,/,
  );
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
    createBackup: () => assert.fail("backup must not be created before init"),
    todayIso: () => "2026-10-07",
    toast: (message) => messages.push(message),
    downloadBlob: () => assert.fail("download must not start before init"),
    zipUtils: {},
    loadBackupRecords: async () => ({}),
    collectBackupAgreementFiles: async () => ({}),
    documentRepository: {},
  });

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

  const dependencies = {
    $: () => null,
    state: { user: null },
    isClientReady: () => false,
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
  };
  const workflow =
    context.window.PropertyDeskBackupWorkspaceWorkflow.create(dependencies);

  assert.equal(calls.utils.workspaceTables, dependencies.workspaceTables);
  assert.deepEqual(calls.records.tables, tables);
  assert.equal(calls.records.loadAllPages, dependencies.loadAllPages);
  assert.equal(calls.exporter.createBackup, createBackup);
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
  assert.equal(workflow.attachBackupExportEvents, attachEvents);
  assert.deepEqual(Object.keys(workflow), ["attachBackupExportEvents"]);
});
