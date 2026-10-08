const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
test("property quick notes normalize whitespace and scope updates to the workspace", async () => {
  const context = vm.createContext({ window: {} });
  for (const source of [
    "repository-query-utils.js",
    "workspace-write-reconciliation.js",
    "workspace-record-write-workflow.js",
    "repository-write-feedback.js",
    "property-repository.js",
    "property-note-maintenance.js",
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
    repository: context.window.PropertyDeskPropertyRepository.create({
      getClient: () => state.client,
    }),
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
    "workspace-write-reconciliation.js",
    "workspace-record-write-workflow.js",
    "repository-write-feedback.js",
    "property-repository.js",
    "property-note-maintenance.js",
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
    repository: context.window.PropertyDeskPropertyRepository.create({
      getClient: () => state.client,
    }),
    promptAction: () => "x".repeat(141),
  });

  await assert.doesNotReject(feature.editPropertyQuickNote("property-1"));
  assert.deepEqual(messages, ["Quick notes are limited to 140 characters."]);
});

test("quick note reconciles a lost response against refreshed property state", async () => {
  const context = vm.createContext({ window: {} });
  for (const source of [
    "workspace-write-reconciliation.js",
    "workspace-record-write-workflow.js",
    "repository-write-feedback.js",
    "property-note-maintenance.js",
    "property-quick-note.js",
  ]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", source), "utf8"),
      context,
    );
  }
  const events = [];
  const property = { id: "property-1", address: "10 Main St", notes: "Old" };
  const state = {
    workspaceOwnerId: "workspace-1",
    properties: [property],
  };
  const feature = context.window.PropertyDeskPropertyQuickNote.create({
    state,
    toast: (message) => events.push(["toast", message]),
    fetchAll: async () => {
      property.notes = "Updated note";
      events.push(["refresh"]);
    },
    streetAddress: (item) => item.address,
    repository: {
      updateOwned: async () => {
        throw new Error("connection lost");
      },
    },
    promptAction: () => "Updated note",
  });

  await feature.editPropertyQuickNote("property-1");

  assert.deepEqual(events, [["refresh"], ["toast", "Property note saved"]]);
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
