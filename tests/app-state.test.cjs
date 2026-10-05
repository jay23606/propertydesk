const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("AppState resets workspace-owned values while retaining shared app state", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "app-state.js"),
      "utf8",
    ),
    context,
  );
  const appState = context.window.PropertyDeskAppState;
  const state = appState.create();
  const client = { auth: {} };
  state.client = client;
  state.view = "reports";
  state.auditRequestId = 8;
  state.user = { id: "owner" };
  state.workspaceOwnerId = "owner";
  state.properties = [{ id: "property" }];
  state.pendingCorrection = { id: "payment" };
  state.passwordRecoveryInProgress = true;

  appState.resetWorkspaceState(state);

  assert.equal(state.client, client);
  assert.equal(state.view, "reports");
  assert.equal(state.auditRequestId, 9);
  assert.equal(state.user, null);
  assert.equal(state.workspaceOwnerId, null);
  assert.equal(state.properties.length, 0);
  assert.equal(state.pendingCorrection, null);
  assert.equal(state.passwordRecoveryInProgress, false);
  assert.deepEqual(
    JSON.parse(JSON.stringify(state)),
    JSON.parse(
      JSON.stringify({
        ...appState.create(),
        client,
        view: "reports",
        auditRequestId: 9,
      }),
    ),
  );
});
