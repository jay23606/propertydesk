const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

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
    getUser: () => state.user,
    getWorkspaceOwnerId: () => state.workspaceOwnerId,
    modules: { archive: context.window.PropertyDeskBackupArchive },
    isClientReady: () => true,
    now: () => new Date("2026-10-04T12:00:00.000Z"),
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

  assert.deepEqual(Object.keys(feature), ["attachBackupExportEvents"]);
  feature.attachBackupExportEvents();
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
    getUser: () => state.user,
    getWorkspaceOwnerId: () => state.workspaceOwnerId,
    modules: { archive: context.window.PropertyDeskBackupArchive },
    isClientReady: () => true,
    now: () => new Date("2026-10-04T12:00:00.000Z"),
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
      createZip(entries, timestamp) {
        zipEntries = entries;
        assert.equal(timestamp.toISOString(), "2026-10-04T12:00:00.000Z");
        return archived;
      },
    },
  });

  feature.attachBackupExportEvents();
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
