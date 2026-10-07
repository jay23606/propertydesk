const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

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
  context.window.PropertyDeskBackupUtils = require("../backup-utils.js");
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
  const tables = context.window.PropertyDeskBackupRecords.tables;
  let exportHandler;
  const button = {
    textContent: "Export backup",
    disabled: false,
    addEventListener(event, handler) {
      assert.equal(event, "click");
      exportHandler = handler;
    },
  };
  const state = {
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
    createBackup: () =>
      assert.fail("invalid paths must stop before backup creation"),
    todayIso: () => "2026-10-04",
    toast: (message) => messages.push(message),
    prettyType: (value) => value,
    accountBalance: () => 0,
    downloadBlob: (blob) => downloads.push(blob),
    documentRepository: context.window.PropertyDeskDocumentRepository.create(
      () => state.client,
    ),
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
  context.window.PropertyDeskBackupUtils = require("../backup-utils.js");
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
  const tables = context.window.PropertyDeskBackupRecords.tables;
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
  const state = {
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
    createBackup(records, exportedAt, includedFiles) {
      backupContents = { records, exportedAt, includedFiles };
      return { records };
    },
    todayIso: () => "2026-10-04",
    toast() {},
    downloadBlob(blob, filename) {
      download = { blob, filename };
    },
    documentRepository: context.window.PropertyDeskDocumentRepository.create(
      () => state.client,
    ),
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
