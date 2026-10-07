const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function createRefresh({ state, workspaceData, toast, render }) {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "workspace-refresh.js"),
      "utf8",
    ),
    context,
  );
  return context.window.PropertyDeskWorkspaceRefresh.create({
    state,
    workspaceData,
    toast,
    render,
  });
}

test("workspace refresh resolves workspace, hydrates state, and rerenders", async () => {
  const state = { properties: [] };
  const calls = [];
  const refresh = createRefresh({
    state,
    workspaceData: {
      loadWorkspaceId: async (...args) => {
        assert.deepEqual(args, []);
        return { data: "workspace-1", error: null };
      },
      loadWorkspaceRecords: async (...args) => {
        calls.push(["load", ...args]);
        return { properties: [{ id: "property-1" }], payments: [] };
      },
    },
    toast: (message) => calls.push(["toast", message]),
    render: () => calls.push(["render"]),
  });

  await refresh.fetchAll();

  assert.equal(state.workspaceOwnerId, "workspace-1");
  assert.equal(state.properties[0].id, "property-1");
  assert.deepEqual(calls, [["load", "workspace-1"], ["render"]]);
});

test("workspace lookup failures show feedback and stop before loading records", async () => {
  const failure = new Error("Workspace lookup failed");
  const calls = [];
  const state = {
    client: { rpc: async () => ({ data: null, error: failure }) },
  };
  const refresh = createRefresh({
    state,
    workspaceData: {
      loadWorkspaceId: async () => ({ data: null, error: failure }),
      loadWorkspaceRecords: async () => calls.push("load"),
    },
    toast: (message) => calls.push(["toast", message]),
    render: () => calls.push("render"),
  });

  await assert.rejects(
    () => refresh.fetchAll(),
    (error) => error === failure,
  );
  assert.deepEqual(calls, [["toast", "Workspace lookup failed"]]);
  assert.equal(state.workspaceOwnerId, undefined);
});

test("record loading failures show feedback, rethrow, and skip rendering", async () => {
  const failure = new Error("Records unavailable");
  const calls = [];
  const state = {
    client: { rpc: async () => ({ data: "workspace-1", error: null }) },
  };
  const refresh = createRefresh({
    state,
    workspaceData: {
      loadWorkspaceId: async () => ({ data: "workspace-1", error: null }),
      loadWorkspaceRecords: async () => {
        throw failure;
      },
    },
    toast: (message) => calls.push(["toast", message]),
    render: () => calls.push("render"),
  });

  await assert.rejects(
    () => refresh.fetchAll(),
    (error) => error === failure,
  );
  assert.equal(state.workspaceOwnerId, "workspace-1");
  assert.deepEqual(calls, [["toast", "Records unavailable"]]);
});

test("workspace render failures are logged, shown to the user, and rethrown", async () => {
  const failure = new Error("missing amortization helper");
  const calls = [];
  const context = vm.createContext({
    window: { console: { error: (...args) => calls.push(["error", ...args]) } },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "workspace-refresh.js"),
      "utf8",
    ),
    context,
  );
  const refresh = context.window.PropertyDeskWorkspaceRefresh.create({
    state: {
      client: { rpc: async () => ({ data: "workspace-1", error: null }) },
    },
    workspaceData: {
      loadWorkspaceId: async () => ({ data: "workspace-1", error: null }),
      loadWorkspaceRecords: async () => ({ properties: [] }),
    },
    toast: (message) => calls.push(["toast", message]),
    render: () => {
      throw failure;
    },
  });

  await assert.rejects(
    () => refresh.fetchAll(),
    (error) => error === failure,
  );
  assert.deepEqual(calls, [
    ["error", "PropertyDesk failed to render workspace data.", failure],
    [
      "toast",
      "Workspace data loaded but could not be displayed. Reload and try again.",
    ],
  ]);
});
