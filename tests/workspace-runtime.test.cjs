const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("workspace runtime connects backend, fresh state, and data refresh", () => {
  const calls = [];
  const backend = { configured: true };
  const state = { client: null };
  const workspaceData = { loadWorkspaceId() {}, loadWorkspaceRecords() {} };
  const workspaceQuery = { loadAllPages() {} };
  const fetchAll = async () => {};
  const options = {
    config: { supabaseUrl: "https://example.test" },
    supabase: { createClient() {} },
    toast() {},
    render() {},
  };
  const context = vm.createContext({
    window: {
      PropertyDeskBackendClient: {
        create(received) {
          calls.push(["backend", received]);
          return backend;
        },
      },
      PropertyDeskAppState: {
        create() {
          calls.push(["state"]);
          return state;
        },
      },
      PropertyDeskWorkspaceTables: { properties: "pd_properties" },
      PropertyDeskWorkspaceQuery: {
        create(received) {
          calls.push(["query", received]);
          return workspaceQuery;
        },
      },
      PropertyDeskWorkspaceData: {
        create(received) {
          calls.push(["data", received]);
          return workspaceData;
        },
      },
      PropertyDeskWorkspaceRefresh: {
        create(received) {
          calls.push(["refresh", received]);
          return { fetchAll };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "workspace-runtime.js"),
      "utf8",
    ),
    context,
  );

  const runtime = context.window.PropertyDeskWorkspaceRuntime.create(options);

  assert.equal(calls[0][0], "backend");
  assert.equal(calls[0][1].config, options.config);
  assert.equal(calls[0][1].supabase, options.supabase);
  assert.equal(calls[1][0], "state");
  assert.equal(calls[2][0], "query");
  state.client = { id: "authenticated-client" };
  assert.equal(calls[2][1].getClient(), state.client);
  assert.equal(calls[3][0], "data");
  assert.equal(calls[3][1].tables, context.window.PropertyDeskWorkspaceTables);
  assert.equal(calls[3][1].workspaceQuery, workspaceQuery);
  assert.equal(calls[4][0], "refresh");
  assert.equal(calls[4][1].state, state);
  assert.equal(calls[4][1].workspaceData, workspaceData);
  assert.equal(calls[4][1].toast, options.toast);
  assert.equal(calls[4][1].render, options.render);
  assert.equal(runtime.backend, backend);
  assert.equal(runtime.state, state);
  assert.equal(runtime.fetchAll, fetchAll);
  assert.equal(runtime.workspaceQuery, workspaceQuery);
});
