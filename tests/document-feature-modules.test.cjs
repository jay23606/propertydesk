const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const {
  loadDocumentModules,
  createDocuments,
} = require("./document-test-helpers.cjs");

test("private document module exposes upload, delete, and open workflows", () => {
  const context = vm.createContext({ window: {} });
  loadDocumentModules(context);

  const feature = createDocuments(context, {
    state: { client: {} },
  });
  assert.equal(Object.isFrozen(feature), true);
  for (const action of [
    "uploadPropertyDocument",
    "deletePropertyDocument",
    "openPropertyDocument",
  ]) {
    assert.equal(typeof feature[action], "function", action);
  }
});

test("document maintenance receives write feedback through explicit dependencies", () => {
  const root = path.join(__dirname, "..");
  for (const filename of [
    "document-upload.js",
    "document-upload-maintenance.js",
    "document-delete.js",
    "document-delete-maintenance.js",
  ]) {
    const source = fs.readFileSync(
      path.join(root, "features", filename),
      "utf8",
    );
    assert.doesNotMatch(source, /window\.PropertyDeskRepositoryWriteFeedback/);
    assert.match(source, /writeFeedback/);
  }
});

test("document actions separate deletion and signed-link dependencies", () => {
  const root = path.join(__dirname, "..");
  assert.doesNotMatch(
    fs.readFileSync(path.join(root, "features", "document-actions.js"), "utf8"),
    /window\.PropertyDeskDocument(?:Delete|Open)\.create/,
  );
  assert.doesNotMatch(
    fs.readFileSync(path.join(root, "features", "documents.js"), "utf8"),
    /window\.PropertyDeskDocument(?:Upload|Actions|UploadPolicy)[^.]*\.create|window\.PropertyDeskDocumentUploadPolicy\.describe/,
  );
  const passed = {};
  const deleteAction = () => "deleted";
  const openAction = () => "opened";
  const context = vm.createContext({
    window: {
      PropertyDeskDocumentDelete: {
        create: (options) => {
          passed.deletion = options;
          return { deletePropertyDocument: deleteAction };
        },
      },
      PropertyDeskDocumentOpen: {
        create: (options) => {
          passed.open = options;
          return { openPropertyDocument: openAction };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "document-actions.js"),
      "utf8",
    ),
    context,
  );
  const dependencies = {
    state: {},
    toast() {},
    fetchAll() {},
    openPropertyDetails() {},
    confirm() {},
    openWindow() {},
    repository: {},
    writeFeedback: { kind: "write-feedback" },
    modules: {
      delete: context.window.PropertyDeskDocumentDelete,
      open: context.window.PropertyDeskDocumentOpen,
    },
  };

  const actions =
    context.window.PropertyDeskDocumentActions.create(dependencies);

  assert.equal(passed.deletion.state, dependencies.state);
  assert.equal(passed.deletion.fetchAll, dependencies.fetchAll);
  assert.equal(passed.deletion.confirm, dependencies.confirm);
  assert.equal(passed.deletion.repository, dependencies.repository);
  assert.equal(passed.deletion.writeFeedback, dependencies.writeFeedback);
  assert.equal(passed.deletion.openWindow, undefined);
  assert.equal(passed.open.state, dependencies.state);
  assert.equal(passed.open.openWindow, dependencies.openWindow);
  assert.equal(passed.open.repository, dependencies.repository);
  assert.equal(passed.open.fetchAll, undefined);
  assert.equal(actions.deletePropertyDocument, deleteAction);
  assert.equal(actions.openPropertyDocument, openAction);
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
  const feature = createDocuments(context, {
    state,
    toast: (message) => messages.push(message),
    fetchAll: async () => {
      throw new Error("refresh offline");
    },
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
    "Agreement upload result couldn't be confirmed, and private file cleanup couldn't be verified. Check storage before retrying. upload offline",
    "Agreement file removal result couldn't be confirmed. Reload property details and check the agreement before retrying.",
    "Agreement link failed: signing offline",
  ]);
});
