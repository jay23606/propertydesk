const assert = require("node:assert/strict");
const test = require("node:test");
const vm = require("node:vm");
const {
  loadDocumentModules,
  createDocuments,
} = require("./document-test-helpers.cjs");

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
