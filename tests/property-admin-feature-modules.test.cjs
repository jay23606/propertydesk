const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
test("property quick notes normalize whitespace and scope updates to the workspace", async () => {
  const context = vm.createContext({ window: {} });
  for (const source of [
    "repository-query-utils.js",
    "repository-write-feedback.js",
    "property-repository.js",
    "property-maintenance.js",
    "property-quick-note.js",
  ]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", source), "utf8"),
      context,
    );
  }
  const updates = [];
  const messages = [];
  let refreshed = false;
  const state = {
    workspaceOwnerId: "workspace-1",
    selectedPropertyId: "property-1",
    properties: [
      { id: "property-1", address: "10 Main St", notes: "Old note" },
    ],
    client: {
      from(table) {
        assert.equal(table, "pd_properties");
        return {
          update(values) {
            updates.push(values);
            return {
              eq(column, value) {
                updates.push([column, value]);
                return {
                  eq: async (ownerColumn, ownerId) => {
                    updates.push([ownerColumn, ownerId]);
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
  const feature = context.window.PropertyDeskPropertyQuickNote.create({
    state,
    toast: (message) => messages.push(message),
    fetchAll: async () => {
      refreshed = true;
    },
    streetAddress: (property) => property.address,
    promptAction: () => "  Follow-up\n needed   soon ",
  });

  await feature.editPropertyQuickNote("property-1");

  assert.equal(updates[0].notes, "Follow-up needed soon");
  assert.equal(updates[1][0], "id");
  assert.equal(updates[1][1], "property-1");
  assert.equal(updates[2][0], "user_id");
  assert.equal(updates[2][1], "workspace-1");
  assert.equal(refreshed, true);
  assert.equal(messages.at(-1), "Property note saved");
});

test("property quick notes enforce the character limit before writing", async () => {
  const context = vm.createContext({ window: {} });
  for (const source of [
    "repository-query-utils.js",
    "repository-write-feedback.js",
    "property-repository.js",
    "property-maintenance.js",
    "property-quick-note.js",
  ]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", source), "utf8"),
      context,
    );
  }
  const messages = [];
  const state = {
    properties: [{ id: "property-1", address: "10 Main St" }],
    client: { from: () => assert.fail("an overlong note must not write") },
  };
  const feature = context.window.PropertyDeskPropertyQuickNote.create({
    state,
    toast: (message) => messages.push(message),
    fetchAll: async () => assert.fail("an overlong note must not refresh"),
    streetAddress: (property) => property.address,
    promptAction: () => "x".repeat(141),
  });

  await assert.doesNotReject(feature.editPropertyQuickNote("property-1"));
  assert.deepEqual(messages, ["Quick notes are limited to 140 characters."]);
});

test("property holder and archive workflows report rejected writes without running success actions", async () => {
  const context = vm.createContext({
    window: {},
    document: { querySelectorAll: () => [] },
  });
  for (const source of [
    "repository-query-utils.js",
    "repository-write-feedback.js",
    "property-holder-repository.js",
    "property-holder-management.js",
    "property-repository.js",
    "property-maintenance.js",
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
      fetchAll: async () => assert.fail("a rejected write must not refresh"),
      openPropertyDetails: () =>
        assert.fail("a rejected write must not reopen details"),
    });
  const archive = context.window.PropertyDeskPropertyArchive.create({
    state,
    toast: (message) => messages.push(message),
    fetchAll: async () => assert.fail("a rejected write must not refresh"),
    todayIso: () => "2026-10-05",
    openPropertyDetails: () =>
      assert.fail("a rejected write must not reopen details"),
  });

  await assert.doesNotReject(holderManagement.savePropertyHolders());
  await assert.doesNotReject(archive.toggleArchiveProperty());
  assert.deepEqual(messages, [
    "Account-holder labels couldn't be saved right now. Check your connection and try again.",
    "Property status couldn't be updated right now. Check your connection and try again.",
  ]);
});

test("archive and restore writes share property maintenance and reopen updated details", async () => {
  const context = vm.createContext({ window: {} });
  for (const source of [
    "repository-query-utils.js",
    "repository-write-feedback.js",
    "property-repository.js",
    "property-maintenance.js",
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
    todayIso: () => "2026-10-06",
    openPropertyDetails: (id) => calls.push(["open", id]),
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

test("quick note and grid actions load before the Properties workflow", () => {
  const html = fs.readFileSync(
    path.join(__dirname, "..", "index.html"),
    "utf8",
  );
  const worker = fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8");
  assert.ok(
    html.indexOf("features/property-quick-note.js") <
      html.indexOf("features/property-portfolio-workflow.js"),
    "property quick note should load before the Properties workflow",
  );
  assert.ok(
    html.indexOf("features/property-view-events.js") <
      html.indexOf("features/property-portfolio-workflow.js"),
  );
  for (const source of [
    "property-quick-note.js",
    "property-view-events.js",
    "property-portfolio-workflow.js",
  ]) {
    assert.ok(worker.includes(`'./features/${source}'`));
  }
});
