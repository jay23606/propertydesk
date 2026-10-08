const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
test("property holder and archive workflows reconcile rejected writes before retry", async () => {
  const context = vm.createContext({
    window: {},
    document: { querySelectorAll: () => [] },
  });
  for (const source of [
    "repository-query-utils.js",
    "workspace-write-reconciliation.js",
    "workspace-record-write-workflow.js",
    "repository-write-feedback.js",
    "property-record-update-maintenance.js",
    "property-holder-repository.js",
    "property-holder-management.js",
    "property-repository.js",
    "property-status-maintenance.js",
    "property-archive.js",
  ]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", source), "utf8"),
      context,
    );
  }
  const messages = [];
  const rejectingQuery = () => {
    let filters = 0;
    const query = {
      eq() {
        filters += 1;
        return filters === 2 ? Promise.reject(new Error("offline")) : query;
      },
    };
    return query;
  };
  const state = {
    workspaceOwnerId: "workspace-1",
    selectedPropertyId: "property-1",
    properties: [
      { id: "property-1", address: "10 Main St", archived_at: null },
    ],
    client: {
      from() {
        return {
          update() {
            return rejectingQuery();
          },
          delete() {
            return rejectingQuery();
          },
        };
      },
    },
  };
  const holderManagement =
    context.window.PropertyDeskPropertyHolderManagement.create({
      state,
      toast: (message) => messages.push(message),
      fetchAll: async () => {
        throw new Error("offline");
      },
      openPropertyDetails: () =>
        assert.fail("a rejected write must not reopen details"),
      repository: context.window.PropertyDeskPropertyHolderRepository.create({
        getClient: () => state.client,
      }),
    });
  const archive = context.window.PropertyDeskPropertyArchive.create({
    state,
    toast: (message) => messages.push(message),
    fetchAll: async () => {
      throw new Error("offline");
    },
    writeFeedback: context.window.PropertyDeskRepositoryWriteFeedback,
    todayIso: () => "2026-10-05",
    openPropertyDetails: () =>
      assert.fail("a rejected write must not reopen details"),
    repository: context.window.PropertyDeskPropertyRepository.create({
      getClient: () => state.client,
    }),
  });

  await assert.doesNotReject(holderManagement.savePropertyHolders());
  await assert.doesNotReject(archive.toggleArchiveProperty());
  assert.deepEqual(messages, [
    "Account-holder label update status couldn't be confirmed, and the workspace could not refresh. Reload to verify the current labels.",
    "Property status result couldn't be confirmed, and Properties could not refresh. Reload before retrying.",
  ]);
});

test("archive reconciles a lost response against refreshed property state", async () => {
  const context = vm.createContext({ window: {} });
  for (const source of [
    "workspace-write-reconciliation.js",
    "workspace-record-write-workflow.js",
    "repository-write-feedback.js",
    "property-record-update-maintenance.js",
    "property-status-maintenance.js",
    "property-archive.js",
  ]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", source), "utf8"),
      context,
    );
  }
  const events = [];
  const property = { id: "property-1", archived_at: null };
  const state = {
    workspaceOwnerId: "workspace-1",
    selectedPropertyId: property.id,
    properties: [property],
  };
  const archive = context.window.PropertyDeskPropertyArchive.create({
    state,
    toast: (message) => events.push(["toast", message]),
    fetchAll: async () => {
      property.archived_at = "2026-10-08";
      events.push(["refresh"]);
    },
    writeFeedback: context.window.PropertyDeskRepositoryWriteFeedback,
    todayIso: () => "2026-10-08",
    openPropertyDetails: (id) => events.push(["open", id]),
    repository: {
      updateOwned: async () => {
        throw new Error("connection lost");
      },
    },
  });

  await archive.toggleArchiveProperty();

  assert.deepEqual(events, [
    ["refresh"],
    ["open", "property-1"],
    ["toast", "Property archived"],
  ]);
});

test("archive and restore use status maintenance and reopen updated details", async () => {
  const context = vm.createContext({ window: {} });
  for (const source of [
    "repository-query-utils.js",
    "workspace-write-reconciliation.js",
    "workspace-record-write-workflow.js",
    "repository-write-feedback.js",
    "property-repository.js",
    "property-record-update-maintenance.js",
    "property-status-maintenance.js",
    "property-archive.js",
  ]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", source), "utf8"),
      context,
    );
  }
  const calls = [];
  const messages = [];
  const property = {
    id: "property-1",
    archived_at: null,
  };
  const state = {
    workspaceOwnerId: "workspace-1",
    selectedPropertyId: property.id,
    properties: [property],
    client: {
      from(table) {
        assert.equal(table, "pd_properties");
        return {
          update(values) {
            calls.push(["update", values]);
            return {
              eq(column, id) {
                calls.push(["filter", column, id]);
                return {
                  eq: async (ownerColumn, ownerId) => {
                    calls.push(["filter", ownerColumn, ownerId]);
                    return { error: null };
                  },
                };
              },
            };
          },
        };
      },
    },
  };
  const archive = context.window.PropertyDeskPropertyArchive.create({
    state,
    toast: (message) => messages.push(message),
    fetchAll: async () => {
      calls.push(["refresh"]);
      property.archived_at = calls.findLast(
        ([operation]) => operation === "update",
      )[1].archived_at;
    },
    writeFeedback: context.window.PropertyDeskRepositoryWriteFeedback,
    todayIso: () => "2026-10-06",
    openPropertyDetails: (id) => calls.push(["open", id]),
    repository: context.window.PropertyDeskPropertyRepository.create({
      getClient: () => state.client,
    }),
  });

  await archive.toggleArchiveProperty();
  await archive.toggleArchiveProperty();

  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [
    ["update", { archived_at: "2026-10-06" }],
    ["filter", "id", "property-1"],
    ["filter", "user_id", "workspace-1"],
    ["refresh"],
    ["open", "property-1"],
    ["update", { archived_at: null }],
    ["filter", "id", "property-1"],
    ["filter", "user_id", "workspace-1"],
    ["refresh"],
    ["open", "property-1"],
  ]);
  assert.deepEqual(messages, ["Property archived", "Property restored"]);
});

test("property holder save persists the member IDs supplied by the event layer", async () => {
  const context = vm.createContext({ window: {} });
  for (const source of [
    "repository-query-utils.js",
    "workspace-write-reconciliation.js",
    "workspace-record-write-workflow.js",
    "repository-write-feedback.js",
    "property-holder-repository.js",
    "property-holder-management.js",
  ]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", source), "utf8"),
      context,
    );
  }
  const calls = [];
  const messages = [];
  const state = {
    workspaceOwnerId: "workspace-1",
    selectedPropertyId: "property-1",
    client: {
      from(table) {
        assert.equal(table, "pd_property_holders");
        return {
          delete() {
            return {
              eq(column, value) {
                calls.push(["delete-filter", column, value]);
                return {
                  eq: async (propertyColumn, propertyId) => {
                    calls.push(["delete-filter", propertyColumn, propertyId]);
                    return { error: null };
                  },
                };
              },
            };
          },
          async insert(rows) {
            calls.push(["insert", rows]);
            return { error: null };
          },
        };
      },
    },
  };
  const workflow = context.window.PropertyDeskPropertyHolderManagement.create({
    state,
    toast: (message) => messages.push(message),
    fetchAll: async () => calls.push(["refresh"]),
    openPropertyDetails: (propertyId) => calls.push(["open", propertyId]),
    repository: context.window.PropertyDeskPropertyHolderRepository.create({
      getClient: () => state.client,
    }),
  });

  await workflow.savePropertyHolders(["member-1", "member-2"]);

  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [
    ["delete-filter", "user_id", "workspace-1"],
    ["delete-filter", "property_id", "property-1"],
    [
      "insert",
      [
        {
          user_id: "workspace-1",
          property_id: "property-1",
          member_user_id: "member-1",
        },
        {
          user_id: "workspace-1",
          property_id: "property-1",
          member_user_id: "member-2",
        },
      ],
    ],
    ["refresh"],
    ["open", "property-1"],
  ]);
  assert.deepEqual(messages, ["Account-holder labels saved"]);
});

test("property holder refreshes displayed labels after a partial save failure", async () => {
  const context = vm.createContext({ window: {} });
  for (const source of [
    "workspace-write-reconciliation.js",
    "workspace-record-write-workflow.js",
    "repository-write-feedback.js",
    "property-holder-management.js",
  ]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", source), "utf8"),
      context,
    );
  }
  const events = [];
  const workflow = context.window.PropertyDeskPropertyHolderManagement.create({
    state: {
      workspaceOwnerId: "workspace-1",
      selectedPropertyId: "property-1",
      propertyHolders: [],
    },
    toast: (message) => events.push(["toast", message]),
    fetchAll: async () => events.push(["refresh"]),
    openPropertyDetails: (id) => events.push(["open", id]),
    repository: {
      clearPropertyHolders: async () => ({ error: null }),
      addPropertyHolders: async () => ({ error: new Error("Insert failed") }),
    },
  });

  await workflow.savePropertyHolders(["member-1"]);

  assert.deepEqual(events, [
    ["toast", "Insert failed"],
    ["refresh"],
    ["open", "property-1"],
    [
      "toast",
      "Current account-holder labels were refreshed. Check them before retrying.",
    ],
  ]);
});

test("property holder reports when a partial save cannot refresh the displayed labels", async () => {
  const context = vm.createContext({ window: {} });
  for (const source of [
    "workspace-write-reconciliation.js",
    "workspace-record-write-workflow.js",
    "repository-write-feedback.js",
    "property-holder-management.js",
  ]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", source), "utf8"),
      context,
    );
  }
  const events = [];
  const workflow = context.window.PropertyDeskPropertyHolderManagement.create({
    state: {
      workspaceOwnerId: "workspace-1",
      selectedPropertyId: "property-1",
    },
    toast: (message) => events.push(["toast", message]),
    fetchAll: async () => {
      events.push(["refresh"]);
      throw new Error("offline");
    },
    openPropertyDetails: () => events.push(["open"]),
    repository: {
      clearPropertyHolders: async () => ({ error: null }),
      addPropertyHolders: async () => ({ error: new Error("Insert failed") }),
    },
  });

  await workflow.savePropertyHolders(["member-1"]);

  assert.deepEqual(events, [
    ["toast", "Insert failed"],
    ["refresh"],
    [
      "toast",
      "Account-holder labels could not be fully saved, and the workspace could not refresh. Reload to verify the current labels.",
    ],
  ]);
});

test("property holder reloads after a rejected label write with an unknown result", async () => {
  for (const rejectedStep of ["clear", "add"]) {
    const context = vm.createContext({ window: {} });
    for (const source of [
      "workspace-write-reconciliation.js",
      "workspace-record-write-workflow.js",
      "repository-write-feedback.js",
      "property-holder-management.js",
    ]) {
      vm.runInContext(
        fs.readFileSync(path.join(__dirname, "..", "features", source), "utf8"),
        context,
      );
    }
    const events = [];
    const state = {
      workspaceOwnerId: "workspace-1",
      selectedPropertyId: "property-1",
      propertyHolders: [],
    };
    const workflow = context.window.PropertyDeskPropertyHolderManagement.create(
      {
        state,
        toast: (message) => events.push(["toast", message]),
        fetchAll: async () => {
          state.propertyHolders = [
            {
              user_id: "workspace-1",
              property_id: "property-1",
              member_user_id: "member-1",
            },
          ];
          events.push(["refresh"]);
        },
        openPropertyDetails: (id) => events.push(["open", id]),
        repository: {
          clearPropertyHolders: async () => {
            if (rejectedStep === "clear") throw new Error("offline");
            return { error: null };
          },
          addPropertyHolders: async () => {
            if (rejectedStep === "add") throw new Error("offline");
            return { error: null };
          },
        },
      },
    );

    const saved = await workflow.savePropertyHolders(["member-1"]);

    assert.equal(saved, true);
    assert.deepEqual(events, [
      ["refresh"],
      ["open", "property-1"],
      ["toast", "Account-holder labels saved"],
    ]);
  }
});
