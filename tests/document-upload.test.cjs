const assert = require("node:assert/strict");
const test = require("node:test");
const vm = require("node:vm");
const {
  loadDocumentModules,
  createDocuments,
} = require("./document-test-helpers.cjs");

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
