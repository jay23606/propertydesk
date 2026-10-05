const assert = require("node:assert/strict");
const test = require("node:test");
const { loadWorkspaceFeatures } = require("./feature-test-helpers.cjs");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
test("property quick notes normalize whitespace and scope updates to the workspace", async () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "property-quick-note.js"),
      "utf8",
    ),
    context,
  );
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
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "property-quick-note.js"),
      "utf8",
    ),
    context,
  );
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
  const context = vm.createContext({ window: {}, document: { querySelectorAll: () => [] } });
  for (const source of ["property-holder-management.js", "property-archive.js"]) {
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
    properties: [{ id: "property-1", address: "10 Main St", archived_at: null }],
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
  const holderManagement = context.window.PropertyDeskPropertyHolderManagement.create({
    state,
    toast: (message) => messages.push(message),
    fetchAll: async () => assert.fail("a rejected write must not refresh"),
    openPropertyDetails: () => assert.fail("a rejected write must not reopen details"),
  });
  const archive = context.window.PropertyDeskPropertyArchive.create({
    state,
    toast: (message) => messages.push(message),
    fetchAll: async () => assert.fail("a rejected write must not refresh"),
    todayIso: () => "2026-10-05",
    openPropertyDetails: () => assert.fail("a rejected write must not reopen details"),
  });

  await assert.doesNotReject(holderManagement.savePropertyHolders());
  await assert.doesNotReject(archive.toggleArchiveProperty());
  assert.deepEqual(messages, [
    "Account-holder labels couldn't be saved right now. Check your connection and try again.",
    "Property status couldn't be updated right now. Check your connection and try again.",
  ]);
});


test("quick note feature loads before the portfolio workflow and is precached", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8");
  assert.ok(
    html.indexOf("features/property-quick-note.js") < html.indexOf("features/property-portfolio-workflow.js"),
    "property quick note should load before the portfolio coordinator",
  );
  assert.match(worker, /'\.\/features\/property-quick-note\.js'/);
});

