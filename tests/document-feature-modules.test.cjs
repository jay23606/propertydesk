const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadDocumentModules(context) {
  for (const filename of ["document-repository.js", "documents.js"]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
      context,
    );
  }
}

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

test("backup export aborts before download when a private document path escapes the workspace", async () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "exports.js"),
      "utf8",
    ),
    context,
  );
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
  const button = { textContent: "Export backup", disabled: false };
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
  const feature = context.window.PropertyDeskExports.create({
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

  await feature.exportAll();

  assert.equal(downloads.length, 0);
  assert.equal(button.disabled, false);
  assert.equal(button.textContent, "Export backup");
  assert.match(messages.at(-1), /invalid private storage path/);
});
