const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("backup workspace workflow owns backup dependency composition", () => {
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  assert.match(
    app,
    /PropertyDeskBackupWorkspaceWorkflow\.create\(\{[\s\S]*?workspaceTables: window\.PropertyDeskWorkspaceTables,[\s\S]*?loadAllPages: workspaceQuery\.loadAllPages,[\s\S]*?collectBackupAgreementFiles:[\s\S]*?window\.PropertyDeskBackupAgreementFiles\.collect,[\s\S]*?documentRepository: repositories\.documents,/,
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

  feature.attachEvents();
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
          return { attachEvents };
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
  assert.equal(workflow.attachEvents, attachEvents);
});

test("backup agreement collector downloads only workspace-scoped files into the archive manifest", async () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "document-repository.js"),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "backup-agreement-files.js"),
      "utf8",
    ),
    context,
  );
  const fileBytes = new Uint8Array([1, 2, 3]);
  const storagePath = "workspace-1/property-1/doc-1-agreement.pdf";
  const collected =
    await context.window.PropertyDeskBackupAgreementFiles.collect({
      documents: [
        {
          id: "doc-1",
          user_id: "workspace-1",
          property_id: "property-1",
          account_id: null,
          storage_path: storagePath,
          file_name: "Signed # agreement.pdf",
          content_type: "application/pdf",
        },
      ],
      workspaceOwnerId: "workspace-1",
      repository: context.window.PropertyDeskDocumentRepository.create({
        getClient: () => ({
          storage: {
            from(bucket) {
              assert.equal(bucket, "pd-private-agreements");
              return {
                async download(path) {
                  assert.equal(path, storagePath);
                  return {
                    data: {
                      async arrayBuffer() {
                        return fileBytes.buffer;
                      },
                    },
                    error: null,
                  };
                },
              };
            },
          },
        }),
      }),
    });

  assert.equal(
    collected.entries[0].name,
    "agreements/property-1/doc-1-Signed___agreement.pdf",
  );
  assert.deepEqual(Array.from(collected.entries[0].data), [1, 2, 3]);
  assert.equal(collected.includedFiles[0].file_size, 3);
  assert.equal(collected.includedFiles[0].content_type, "application/pdf");
  assert.equal(collected.includedFiles[0].property_id, "property-1");
});

test("backup export aborts before download when a private document path escapes the workspace", async () => {
  const context = vm.createContext({ window: {} });
  context.window.PropertyDeskWorkspaceTables = require("../workspace-table-catalog.js");
  context.window.PropertyDeskBackupUtils =
    require("../features/backup-utils.js").create({
      workspaceTables: context.window.PropertyDeskWorkspaceTables,
    });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "workspace-query.js"), "utf8"),
    context,
  );
  for (const moduleName of [
    "document-repository.js",
    "backup-agreement-files.js",
    "backup-records.js",
    "backup-archive.js",
    "download-utils.js",
    "backup-export.js",
  ]) {
    vm.runInContext(
      fs.readFileSync(
        path.join(__dirname, "..", "features", moduleName),
        "utf8",
      ),
      context,
    );
  }
  let state;
  const workspaceQuery = context.window.PropertyDeskWorkspaceQuery.create({
    getClient: () => state.client,
  });
  const backupRecords = context.window.PropertyDeskBackupRecords.create({
    tables: context.window.PropertyDeskBackupUtils.tables,
    loadAllPages: workspaceQuery.loadAllPages,
  });
  const tables = backupRecords.tables;
  let exportHandler;
  const button = {
    textContent: "Export backup",
    disabled: false,
    addEventListener(event, handler) {
      assert.equal(event, "click");
      exportHandler = handler;
    },
  };
  state = {
    user: { id: "workspace-1" },
    workspaceOwnerId: "workspace-1",
    accounts: [],
    properties: [],
    client: {
      from(table) {
        assert.ok(tables.includes(table));
        return {
          select() {
            return {
              async range() {
                return {
                  data:
                    table === "pd_documents"
                      ? [
                          {
                            id: "doc-1",
                            user_id: "workspace-1",
                            storage_path: "other-workspace/property/file.pdf",
                            file_name: "file.pdf",
                          },
                        ]
                      : [],
                  error: null,
                };
              },
            };
          },
        };
      },
    },
  };
  const messages = [];
  const downloads = [];
  const feature = context.window.PropertyDeskBackupExport.create({
    $: (id) => (id === "export-all" ? button : null),
    state,
    isClientReady: () => true,
    createBackup: () =>
      assert.fail("invalid paths must stop before backup creation"),
    todayIso: () => "2026-10-04",
    toast: (message) => messages.push(message),
    prettyType: (value) => value,
    accountBalance: () => 0,
    downloadBlob: (blob) => downloads.push(blob),
    loadBackupRecords: backupRecords.load,
    collectBackupAgreementFiles:
      context.window.PropertyDeskBackupAgreementFiles.collect,
    documentRepository: context.window.PropertyDeskDocumentRepository.create({
      getClient: () => state.client,
    }),
    zipUtils: {
      createZip: () =>
        assert.fail("invalid paths must stop before zip creation"),
    },
  });

  assert.deepEqual(Object.keys(feature), ["attachEvents"]);
  feature.attachEvents();
  await exportHandler();

  assert.equal(downloads.length, 0);
  assert.equal(button.disabled, false);
  assert.equal(button.textContent, "Export backup");
  assert.match(messages.at(-1), /invalid private storage path/);
});

test("backup export adds the validated private agreement to the ZIP and manifest", async () => {
  const context = vm.createContext({ window: {} });
  context.window.PropertyDeskWorkspaceTables = require("../workspace-table-catalog.js");
  context.window.PropertyDeskBackupUtils =
    require("../features/backup-utils.js").create({
      workspaceTables: context.window.PropertyDeskWorkspaceTables,
    });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "workspace-query.js"), "utf8"),
    context,
  );
  for (const moduleName of [
    "document-repository.js",
    "backup-agreement-files.js",
    "backup-records.js",
    "backup-archive.js",
    "download-utils.js",
    "backup-export.js",
  ]) {
    vm.runInContext(
      fs.readFileSync(
        path.join(__dirname, "..", "features", moduleName),
        "utf8",
      ),
      context,
    );
  }
  let state;
  const workspaceQuery = context.window.PropertyDeskWorkspaceQuery.create({
    getClient: () => state.client,
  });
  const backupRecords = context.window.PropertyDeskBackupRecords.create({
    tables: context.window.PropertyDeskBackupUtils.tables,
    loadAllPages: workspaceQuery.loadAllPages,
  });
  const tables = backupRecords.tables;
  const agreement = {
    id: "doc-1",
    user_id: "workspace-1",
    property_id: "property-1",
    account_id: null,
    storage_path: "workspace-1/property-1/doc-1-agreement.pdf",
    file_name: "Agreement.pdf",
    content_type: "application/pdf",
  };
  const fileBytes = new Uint8Array([4, 5, 6]);
  state = {
    user: { id: "workspace-1" },
    workspaceOwnerId: "workspace-1",
    client: {
      from(table) {
        assert.ok(tables.includes(table));
        return {
          select() {
            return {
              async range() {
                return {
                  data: table === "pd_documents" ? [agreement] : [],
                  error: null,
                };
              },
            };
          },
        };
      },
      storage: {
        from(bucket) {
          assert.equal(bucket, "pd-private-agreements");
          return {
            async download(path) {
              assert.equal(path, agreement.storage_path);
              return {
                data: {
                  async arrayBuffer() {
                    return fileBytes.buffer;
                  },
                },
                error: null,
              };
            },
          };
        },
      },
    },
  };
  const button = {
    textContent: "Export backup",
    disabled: false,
    addEventListener(_event, handler) {
      this.handler = handler;
    },
  };
  const archived = { archive: true };
  let backupContents;
  let zipEntries;
  let download;
  let agreementCollectionCalls = 0;
  const collectBackupAgreementFiles =
    context.window.PropertyDeskBackupAgreementFiles.collect;
  const feature = context.window.PropertyDeskBackupExport.create({
    $: (id) => (id === "export-all" ? button : null),
    state,
    isClientReady: () => true,
    createBackup(records, exportedAt, includedFiles) {
      backupContents = { records, exportedAt, includedFiles };
      return { records };
    },
    todayIso: () => "2026-10-04",
    toast() {},
    loadBackupRecords: backupRecords.load,
    downloadBlob(blob, filename) {
      download = { blob, filename };
    },
    documentRepository: context.window.PropertyDeskDocumentRepository.create({
      getClient: () => state.client,
    }),
    collectBackupAgreementFiles(options) {
      agreementCollectionCalls += 1;
      return collectBackupAgreementFiles(options);
    },
    zipUtils: {
      createZip(entries) {
        zipEntries = entries;
        return archived;
      },
    },
  });

  feature.attachEvents();
  await button.handler();

  assert.equal(backupContents.records.pd_documents[0].id, "doc-1");
  assert.equal(agreementCollectionCalls, 1);
  assert.equal(
    backupContents.includedFiles[0].path,
    "agreements/property-1/doc-1-Agreement.pdf",
  );
  assert.equal(backupContents.includedFiles[0].file_size, 3);
  assert.equal(zipEntries[0].name, "propertydesk-backup.json");
  assert.equal(zipEntries[1].name, backupContents.includedFiles[0].path);
  assert.deepEqual(Array.from(zipEntries[1].data), [4, 5, 6]);
  assert.equal(download.blob, archived);
  assert.equal(download.filename, "propertydesk-backup-2026-10-04.zip");
  assert.equal(button.disabled, false);
  assert.equal(button.textContent, "Export backup");
});
