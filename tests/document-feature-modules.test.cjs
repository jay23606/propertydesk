const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadDocumentModules(context) {
  for (const filename of [
    "workspace-write-reconciliation.js",
    "workspace-record-write-workflow.js",
    "repository-write-feedback.js",
    "document-repository.js",
    "document-upload-policy.js",
    "document-upload.js",
    "document-delete.js",
    "document-open.js",
    "document-actions.js",
    "documents.js",
  ]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
      context,
    );
  }
}

function createDocuments(context, options) {
  return context.window.PropertyDeskDocuments.create({
    ...options,
    repository:
      options.repository ||
      context.window.PropertyDeskDocumentRepository.create({
        getClient: () => options.state.client,
      }),
  });
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

test("document actions separate deletion and signed-link dependencies", () => {
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
  };

  const actions =
    context.window.PropertyDeskDocumentActions.create(dependencies);

  assert.equal(passed.deletion.state, dependencies.state);
  assert.equal(passed.deletion.fetchAll, dependencies.fetchAll);
  assert.equal(passed.deletion.confirm, dependencies.confirm);
  assert.equal(passed.deletion.repository, dependencies.repository);
  assert.equal(passed.deletion.openWindow, undefined);
  assert.equal(passed.open.state, dependencies.state);
  assert.equal(passed.open.openWindow, dependencies.openWindow);
  assert.equal(passed.open.repository, dependencies.repository);
  assert.equal(passed.open.fetchAll, undefined);
  assert.equal(actions.deletePropertyDocument, deleteAction);
  assert.equal(actions.openPropertyDocument, openAction);
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
  const feature = createDocuments(context, {
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

test("document upload saves metadata before refreshing and reopening the property", async () => {
  const context = vm.createContext({ window: {} });
  loadDocumentModules(context);
  const state = {
    selectedPropertyId: "property-1",
    workspaceOwnerId: "workspace-1",
    documents: [],
    client: {
      storage: {
        from: () => ({ upload: async () => ({ error: null }) }),
      },
      from: () => ({
        insert: async (record) => {
          state.document = record;
          return { error: null };
        },
      }),
    },
  };
  const calls = [];
  const feature = createDocuments(context, {
    state,
    toast: (message) => calls.push(["toast", message]),
    fetchAll: async () => calls.push(["refresh"]),
    openPropertyDetails: (propertyId) => calls.push(["open", propertyId]),
    makeId: () => "file-id",
  });

  await feature.uploadPropertyDocument({
    files: [{ name: "Agreement.pdf", size: 5, type: "application/pdf" }],
    value: "selected",
  });

  assert.equal(state.document.user_id, "workspace-1");
  assert.equal(state.document.property_id, "property-1");
  assert.equal(
    state.document.storage_path,
    "workspace-1/property-1/file-id-Agreement.pdf",
  );
  assert.deepEqual(calls, [
    ["toast", "Agreement uploaded privately"],
    ["refresh"],
    ["open", "property-1"],
  ]);
});

test("agreement deletion removes only the selected workspace file before refreshing", async () => {
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
      {
        id: "doc-2",
        user_id: "workspace-1",
        property_id: "property-2",
        storage_path: "workspace-1/property-2/other.pdf",
        file_name: "other.pdf",
      },
    ],
  };
  const calls = [];
  const feature = createDocuments(context, {
    state,
    toast: (message) => calls.push(["toast", message]),
    fetchAll: async () => calls.push(["refresh"]),
    openPropertyDetails: (propertyId) => calls.push(["open", propertyId]),
    confirm: (message) => {
      calls.push(["confirm", message]);
      return true;
    },
    repository: {
      remove: async (storagePath) => {
        calls.push(["remove", storagePath]);
        return { error: null };
      },
      deleteMetadata: async (...args) => {
        calls.push(["deleteMetadata", ...args]);
        return { error: null };
      },
    },
  });

  await feature.deletePropertyDocument("doc-2");
  assert.deepEqual(calls, []);

  await feature.deletePropertyDocument("doc-1");

  assert.deepEqual(
    calls.map(([name]) => name),
    ["confirm", "remove", "deleteMetadata", "toast", "refresh", "open"],
  );
  assert.deepEqual(calls[1], ["remove", "workspace-1/property-1/file.pdf"]);
  assert.deepEqual(calls[2], [
    "deleteMetadata",
    "doc-1",
    "workspace-1",
    "property-1",
  ]);
  assert.deepEqual(calls.at(-1), ["open", "property-1"]);
});

test("document upload reports a saved file when the workspace refresh fails", async () => {
  const context = vm.createContext({ window: {} });
  loadDocumentModules(context);
  const state = {
    selectedPropertyId: "property-1",
    workspaceOwnerId: "workspace-1",
    documents: [],
    client: {
      storage: {
        from: () => ({ upload: async () => ({ error: null }) }),
      },
      from: () => ({ insert: async () => ({ error: null }) }),
    },
  };
  const events = [];
  const feature = createDocuments(context, {
    state,
    toast: (message) => events.push(["toast", message]),
    fetchAll: async () => {
      events.push(["refresh"]);
      throw new Error("offline");
    },
    openPropertyDetails: () => assert.fail("details should not reopen"),
    makeId: () => "file-id",
  });

  await feature.uploadPropertyDocument({
    files: [{ name: "Agreement.pdf", size: 5, type: "application/pdf" }],
    value: "selected",
  });

  assert.deepEqual(events, [
    ["toast", "Agreement uploaded privately"],
    ["refresh"],
    [
      "toast",
      "Agreement was uploaded, but the workspace could not refresh. Reload before uploading it again.",
    ],
  ]);
});

test("document upload removes a possible orphan when the storage response is lost", async () => {
  const context = vm.createContext({ window: {} });
  loadDocumentModules(context);
  const calls = [];
  const state = {
    selectedPropertyId: "property-1",
    workspaceOwnerId: "workspace-1",
    documents: [],
    client: {
      storage: {
        from: () => ({
          upload: async () => {
            calls.push(["upload"]);
            throw new Error("connection lost");
          },
          remove: async (paths) => {
            calls.push(["remove", paths]);
            return { error: null };
          },
        }),
      },
      from: () => assert.fail("uncertain upload must not write metadata"),
    },
  };
  const messages = [];
  const feature = createDocuments(context, {
    state,
    toast: (message) => messages.push(message),
    fetchAll: async () => assert.fail("uncertain upload must not refresh"),
    openPropertyDetails: () => assert.fail("uncertain upload must not reopen"),
    makeId: () => "file-id",
  });
  const input = {
    files: [{ name: "Agreement.pdf", size: 5, type: "application/pdf" }],
    value: "selected",
  };

  await feature.uploadPropertyDocument(input);

  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [
    ["upload"],
    ["remove", ["workspace-1/property-1/file-id-Agreement.pdf"]],
  ]);
  assert.equal(input.value, "");
  assert.match(messages[0], /Any uploaded private file was removed/);
});

test("document deletion reports a deleted file when the workspace refresh fails", async () => {
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
  };
  const events = [];
  const feature = createDocuments(context, {
    state,
    toast: (message) => events.push(["toast", message]),
    fetchAll: async () => {
      events.push(["refresh"]);
      throw new Error("offline");
    },
    openPropertyDetails: () => assert.fail("details should not reopen"),
    confirm: () => true,
    repository: {
      remove: async () => ({ error: null }),
      deleteMetadata: async () => ({ error: null }),
    },
  });

  await feature.deletePropertyDocument("doc-1");

  assert.deepEqual(events, [
    ["toast", "Agreement deleted"],
    ["refresh"],
    [
      "toast",
      "Agreement was deleted, but the workspace could not refresh. Reload to verify its status before trying again.",
    ],
  ]);
});

test("document deletion refreshes and keeps its record after an uncertain storage response", async () => {
  const context = vm.createContext({ window: {} });
  loadDocumentModules(context);
  const doc = {
    id: "doc-1",
    user_id: "workspace-1",
    property_id: "property-1",
    storage_path: "workspace-1/property-1/file.pdf",
    file_name: "file.pdf",
  };
  const state = {
    selectedPropertyId: "property-1",
    workspaceOwnerId: "workspace-1",
    documents: [doc],
  };
  const events = [];
  const feature = createDocuments(context, {
    state,
    toast: (message) => events.push(["toast", message]),
    fetchAll: async () => events.push(["refresh"]),
    openPropertyDetails: (propertyId) => events.push(["open", propertyId]),
    confirm: () => true,
    repository: {
      remove: async () => {
        throw new Error("connection lost");
      },
      deleteMetadata: async () =>
        assert.fail("uncertain storage removal must keep its metadata"),
    },
  });

  await feature.deletePropertyDocument("doc-1");

  assert.deepEqual(events, [
    ["refresh"],
    ["open", "property-1"],
    [
      "toast",
      "Agreement file removal result couldn't be confirmed. The agreement record for file.pdf was kept; verify the file before retrying. connection lost",
    ],
  ]);
});

test("document deletion refreshes after an uncertain metadata response", async () => {
  const context = vm.createContext({ window: {} });
  loadDocumentModules(context);
  const doc = {
    id: "doc-1",
    user_id: "workspace-1",
    property_id: "property-1",
    storage_path: "workspace-1/property-1/file.pdf",
    file_name: "file.pdf",
  };
  const state = {
    selectedPropertyId: "property-1",
    workspaceOwnerId: "workspace-1",
    documents: [doc],
  };
  const events = [];
  const feature = createDocuments(context, {
    state,
    toast: (message) => events.push(["toast", message]),
    fetchAll: async () => {
      events.push(["refresh"]);
      state.documents = [];
    },
    openPropertyDetails: (propertyId) => events.push(["open", propertyId]),
    confirm: () => true,
    repository: {
      remove: async () => ({ error: null }),
      deleteMetadata: async () => {
        throw new Error("connection lost");
      },
    },
  });

  await feature.deletePropertyDocument("doc-1");

  assert.deepEqual(events, [
    [
      "toast",
      "File was deleted, but its document record result couldn't be confirmed. connection lost",
    ],
    ["refresh"],
    ["open", "property-1"],
    ["toast", "Agreement deleted"],
  ]);
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

test("uncertain document metadata writes keep the private file for reconciliation", async () => {
  const context = vm.createContext({ window: {} });
  loadDocumentModules(context);
  const state = {
    selectedPropertyId: "property-1",
    workspaceOwnerId: "workspace-1",
    documents: [],
    removed: [],
    client: {
      storage: {
        from() {
          return {
            upload: async () => ({ error: null }),
            remove: async (paths) => {
              state.removed.push(...paths);
              return { error: null };
            },
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
  const feature = createDocuments(context, {
    state,
    toast: (message) => messages.push(message),
    fetchAll: async () => {
      throw new Error("offline");
    },
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

  assert.match(messages[0], /record result couldn't be confirmed/i);
  assert.match(messages[0], /properties could not refresh/i);
  assert.match(messages[0], /file was kept/i);
  assert.deepEqual(state.removed, []);
});

test("document upload confirms a lost metadata response from refreshed records", async () => {
  const context = vm.createContext({ window: {} });
  loadDocumentModules(context);
  const state = {
    selectedPropertyId: "property-1",
    workspaceOwnerId: "workspace-1",
    documents: [],
    client: {
      storage: {
        from: () => ({ upload: async () => ({ error: null }) }),
      },
      from: () => ({
        insert: async (metadata) => {
          state.pendingMetadata = metadata;
          throw new Error("connection lost");
        },
      }),
    },
  };
  const events = [];
  const feature = createDocuments(context, {
    state,
    toast: (message) => events.push(["toast", message]),
    fetchAll: async () => {
      state.documents = [{ id: "document-1", ...state.pendingMetadata }];
      events.push(["refresh"]);
    },
    openPropertyDetails: (id) => events.push(["open", id]),
    makeId: () => "file-id",
  });

  await feature.uploadPropertyDocument({
    files: [{ name: "Agreement.pdf", size: 5, type: "application/pdf" }],
    value: "selected",
  });

  assert.deepEqual(events, [
    ["refresh"],
    ["open", "property-1"],
    ["toast", "Agreement uploaded privately"],
  ]);
});

test("document upload removes the private orphan after refreshed metadata is absent", async () => {
  const context = vm.createContext({ window: {} });
  loadDocumentModules(context);
  const state = {
    selectedPropertyId: "property-1",
    workspaceOwnerId: "workspace-1",
    documents: [],
    removed: [],
    client: {
      storage: {
        from: () => ({
          upload: async () => ({ error: null }),
          remove: async (paths) => {
            state.removed.push(...paths);
            return { error: null };
          },
        }),
      },
      from: () => ({
        insert: async () => {
          throw new Error("connection lost");
        },
      }),
    },
  };
  const events = [];
  const feature = createDocuments(context, {
    state,
    toast: (message) => events.push(["toast", message]),
    fetchAll: async () => events.push(["refresh"]),
    openPropertyDetails: () => assert.fail("missing metadata must not reopen"),
    makeId: () => "file-id",
  });

  await feature.uploadPropertyDocument({
    files: [{ name: "Agreement.pdf", size: 5, type: "application/pdf" }],
    value: "selected",
  });

  assert.deepEqual(state.removed, [
    "workspace-1/property-1/file-id-Agreement.pdf",
  ]);
  assert.deepEqual(events, [
    ["refresh"],
    [
      "toast",
      "Agreement record was not saved; uploaded file removed. You can retry the upload. connection lost",
    ],
  ]);
});
