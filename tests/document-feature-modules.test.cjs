const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadDocumentModules(context) {
  for (const filename of [
    "document-repository.js",
    "document-upload-policy.js",
    "documents.js",
  ]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
      context,
    );
  }
}

test("agreement upload policy accepts supported files and rejects unsupported or oversized files", () => {
  const context = vm.createContext({ window: {} });
  loadDocumentModules(context);
  const policy = context.window.PropertyDeskDocumentUploadPolicy;

  assert.equal(policy.describe(null), null);
  assert.equal(policy.describe({ name: "lease.txt", size: 10 }), null);
  assert.equal(
    policy.describe({ name: "lease.pdf", size: 15 * 1024 * 1024 + 1 }),
    null,
  );
  const pdf = policy.describe({ name: "signed.PDF", size: 10 });
  assert.equal(pdf.contentType, "application/pdf");
  assert.equal(pdf.safeName, "signed.PDF");
  assert.equal(
    policy.describe({ name: "photo.jpeg", size: 15 * 1024 * 1024 }).contentType,
    "image/jpeg",
  );
  assert.equal(
    policy.describe({ name: "lease.docx", size: 10 }).contentType,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  );
  const safeName = policy.describe({
    name: `${"x".repeat(110)} # signed agreement.pdf`,
    size: 10,
  }).safeName;
  assert.equal(safeName.length, 100);
  assert.doesNotMatch(safeName, /[#\s/]/);
});

test("private document module exposes upload, delete, and open workflows", () => {
  const context = vm.createContext({ window: {} });
  loadDocumentModules(context);

  const feature = context.window.PropertyDeskDocuments.create({
    state: { client: {} },
  });
  for (const action of [
    "uploadPropertyDocument",
    "deletePropertyDocument",
    "openPropertyDocument",
  ]) {
    assert.equal(typeof feature[action], "function", action);
  }
});

test("document upload stores objects privately and removes an orphan after metadata failure", async () => {
  const context = vm.createContext({ window: {} });
  loadDocumentModules(context);
  const state = {
    selectedPropertyId: "property-1",
    workspaceOwnerId: "workspace-1",
    documents: [],
    client: {
      storage: {
        from(bucket) {
          assert.equal(bucket, "pd-private-agreements");
          return {
            async upload(path, file, options) {
              state.upload = { path, file, options };
              return { error: null };
            },
            async remove(paths) {
              state.removed = paths;
              return { error: null };
            },
          };
        },
      },
      from(table) {
        assert.equal(table, "pd_documents");
        return {
          async insert(row) {
            state.document = row;
            return { error: { message: "metadata insert failed" } };
          },
        };
      },
    },
  };
  const messages = [];
  const input = {
    files: [{ name: "Agreement.pdf", size: 5, type: "application/pdf" }],
    value: "selected",
  };
  const feature = context.window.PropertyDeskDocuments.create({
    state,
    toast: (message) => messages.push(message),
    fetchAll: async () => assert.fail("failed metadata must not refresh"),
    openPropertyDetails: () =>
      assert.fail("failed metadata must not reopen details"),
    makeId: () => "file-id",
  });

  await feature.uploadPropertyDocument(input);

  assert.equal(input.value, "");
  assert.equal(
    state.upload.path,
    "workspace-1/property-1/file-id-Agreement.pdf",
  );
  assert.equal(state.upload.options.contentType, "application/pdf");
  assert.equal(state.upload.options.upsert, false);
  assert.equal(state.document.user_id, "workspace-1");
  assert.equal(state.removed.length, 1);
  assert.equal(state.removed[0], state.upload.path);
  assert.match(messages[0], /metadata insert failed/);
});

test("private document workflows handle rejected storage requests without leaking blank tabs", async () => {
  const context = vm.createContext({ window: {} });
  loadDocumentModules(context);
  const state = {
    selectedPropertyId: "property-1",
    workspaceOwnerId: "workspace-1",
    documents: [
      {
        id: "doc-1",
        user_id: "workspace-1",
        property_id: "property-1",
        storage_path: "workspace-1/property-1/file.pdf",
        file_name: "file.pdf",
      },
    ],
    client: {
      storage: {
        from() {
          return {
            upload: async () => {
              throw new Error("upload offline");
            },
            remove: async () => {
              throw new Error("storage offline");
            },
            createSignedUrl: async () => {
              throw new Error("signing offline");
            },
          };
        },
      },
      from: () =>
        assert.fail("database should not be touched after storage rejects"),
    },
  };
  const messages = [];
  const viewer = {
    closed: false,
    close() {
      this.closed = true;
    },
    opener: "parent",
  };
  const feature = context.window.PropertyDeskDocuments.create({
    state,
    toast: (message) => messages.push(message),
    fetchAll: async () => assert.fail("a rejected request must not refresh"),
    openPropertyDetails: () =>
      assert.fail("a rejected request must not reopen details"),
    confirm: () => true,
    openWindow: () => viewer,
    makeId: () => "file-id",
  });
  const input = {
    files: [{ name: "Agreement.pdf", size: 5, type: "application/pdf" }],
    value: "selected",
  };

  await assert.doesNotReject(feature.uploadPropertyDocument(input));
  await assert.doesNotReject(feature.deletePropertyDocument("doc-1"));
  await assert.doesNotReject(feature.openPropertyDocument("doc-1"));
  assert.equal(input.value, "");
  assert.equal(viewer.closed, true);
  assert.deepEqual(messages, [
    "Agreement upload failed: upload offline",
    "Agreement removal failed: storage offline",
    "Agreement link failed: signing offline",
  ]);
});

test("uncertain document metadata writes keep the private file for reconciliation", async () => {
  const context = vm.createContext({ window: {} });
  loadDocumentModules(context);
  const state = {
    selectedPropertyId: "property-1",
    workspaceOwnerId: "workspace-1",
    documents: [],
    client: {
      storage: {
        from() {
          return {
            upload: async () => ({ error: null }),
            remove: async () =>
              assert.fail("uncertain metadata must not delete its file"),
          };
        },
      },
      from: () => ({
        insert: async () => {
          throw new Error("connection lost");
        },
      }),
    },
  };
  const messages = [];
  const feature = context.window.PropertyDeskDocuments.create({
    state,
    toast: (message) => messages.push(message),
    fetchAll: async () =>
      assert.fail("an unconfirmed write must not show success"),
    openPropertyDetails: () =>
      assert.fail("an unconfirmed write must not reopen details"),
    makeId: () => "file-id",
  });

  await assert.doesNotReject(
    feature.uploadPropertyDocument({
      files: [{ name: "Agreement.pdf", size: 5, type: "application/pdf" }],
      value: "selected",
    }),
  );

  assert.match(messages[0], /status couldn't be confirmed/i);
  assert.match(messages[0], /file was kept/i);
});

test("backup agreement collector downloads only workspace-scoped files into the archive manifest", async () => {
  const context = vm.createContext({ window: {} });
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
      client: {
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
      },
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
  for (const moduleName of ["backup-agreement-files.js", "backup-export.js"]) {
    vm.runInContext(
      fs.readFileSync(
        path.join(__dirname, "..", "features", moduleName),
        "utf8",
      ),
      context,
    );
  }
  const tables = [
    "pd_properties",
    "pd_accounts",
    "pd_agreement_versions",
    "pd_payments",
    "pd_expenses",
    "pd_deposit_entries",
    "pd_documents",
    "pd_import_batches",
    "pd_audit_events",
    "pd_workspace_members",
    "pd_property_holders",
  ];
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
  for (const moduleName of ["backup-agreement-files.js", "backup-export.js"]) {
    vm.runInContext(
      fs.readFileSync(
        path.join(__dirname, "..", "features", moduleName),
        "utf8",
      ),
      context,
    );
  }
  const tables = [
    "pd_properties",
    "pd_accounts",
    "pd_agreement_versions",
    "pd_payments",
    "pd_expenses",
    "pd_deposit_entries",
    "pd_documents",
    "pd_import_batches",
    "pd_audit_events",
    "pd_workspace_members",
    "pd_property_holders",
  ];
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
