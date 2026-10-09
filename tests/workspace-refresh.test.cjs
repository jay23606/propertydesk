const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function createRefresh({
  state,
  workspaceData,
  toast,
  render,
  reportError = () => {},
}) {
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
    reportError,
  });
}

function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
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

test("workspace refresh accepts its renderer after runtime construction", async () => {
  const calls = [];
  const refresh = createRefresh({
    state: {},
    workspaceData: {
      loadWorkspaceId: async () => ({ data: "workspace-1", error: null }),
      loadWorkspaceRecords: async () => ({ properties: [] }),
    },
    toast() {},
  });
  refresh.setRender(() => calls.push("render"));

  await refresh.fetchAll();

  assert.deepEqual(calls, ["render"]);
});

test("workspace refresh reports a missing deferred renderer", async () => {
  const messages = [];
  const refresh = createRefresh({
    state: {},
    workspaceData: {
      loadWorkspaceId: async () => ({ data: "workspace-1", error: null }),
      loadWorkspaceRecords: async () => ({ properties: [] }),
    },
    toast: (message) => messages.push(message),
  });

  await assert.rejects(
    () => refresh.fetchAll(),
    /Workspace renderer is not configured/,
  );
  assert.deepEqual(messages, [
    "Workspace data loaded but could not be displayed. Reload and try again.",
  ]);
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
    workspaceOwnerId: "previous-workspace",
    properties: [{ id: "previous-property" }],
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
  assert.equal(state.workspaceOwnerId, "previous-workspace");
  assert.equal(state.properties[0].id, "previous-property");
  assert.deepEqual(calls, [["toast", "Records unavailable"]]);
});

test("workspace data finishing after sign-out cannot restore cleared records", async () => {
  const records = deferred();
  const recordsStarted = deferred();
  const calls = [];
  const state = {
    user: { id: "user-1" },
    workspaceOwnerId: "workspace-1",
    properties: [{ id: "private-property" }],
  };
  const refresh = createRefresh({
    state,
    workspaceData: {
      loadWorkspaceId: async () => ({ data: "workspace-1", error: null }),
      loadWorkspaceRecords: () => {
        recordsStarted.resolve();
        return records.promise;
      },
    },
    toast: (message) => calls.push(["toast", message]),
    render: () => calls.push("render"),
  });

  const pendingRefresh = refresh.fetchAll();
  await recordsStarted.promise;
  state.user = null;
  state.workspaceOwnerId = null;
  state.properties = [];
  records.resolve({ properties: [{ id: "private-property" }] });
  await pendingRefresh;

  assert.equal(state.workspaceOwnerId, null);
  assert.deepEqual(state.properties, []);
  assert.deepEqual(calls, []);
});

test("an older overlapping refresh cannot replace newer workspace data", async () => {
  const firstRecords = deferred();
  const secondRecords = deferred();
  const firstStarted = deferred();
  const secondStarted = deferred();
  const calls = [];
  const state = { user: { id: "user-1" }, properties: [] };
  let readCount = 0;
  const refresh = createRefresh({
    state,
    workspaceData: {
      loadWorkspaceId: async () => ({ data: "workspace-1", error: null }),
      loadWorkspaceRecords: () => {
        readCount += 1;
        if (readCount === 1) {
          firstStarted.resolve();
          return firstRecords.promise;
        }
        secondStarted.resolve();
        return secondRecords.promise;
      },
    },
    toast: (message) => calls.push(["toast", message]),
    render: () => calls.push("render"),
  });

  const olderRefresh = refresh.fetchAll();
  await firstStarted.promise;
  const newerRefresh = refresh.fetchAll();
  await secondStarted.promise;
  secondRecords.resolve({ properties: [{ id: "newer-property" }] });
  await newerRefresh;
  firstRecords.resolve({ properties: [{ id: "older-property" }] });
  await olderRefresh;

  assert.equal(state.workspaceOwnerId, "workspace-1");
  assert.deepEqual(state.properties, [{ id: "newer-property" }]);
  assert.deepEqual(calls, ["render"]);
});

test("workspace render failures are logged, shown to the user, and rethrown", async () => {
  const failure = new Error("missing amortization helper");
  const calls = [];
  const context = vm.createContext({ window: {} });
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
    reportError: (...args) => calls.push(["error", ...args]),
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
