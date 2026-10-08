const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("workspace runtime connects backend, fresh state, and data refresh", () => {
  const calls = [];
  const client = { id: "authenticated-client" };
  const backend = {
    configured: true,
    createClient() {
      calls.push(["create-client"]);
      return client;
    },
  };
  const state = {};
  const workspaceData = { loadWorkspaceId() {}, loadWorkspaceRecords() {} };
  const workspaceQuery = { loadAllPages() {} };
  const workspaceReads = [{ key: "properties", table: "pd_properties" }];
  const repositories = { accounts: { name: "account-repository" } };
  const repositoryAdapters = { accounts: { name: "accounts" } };
  const fetchAll = async () => {};
  const options = {
    config: { supabaseUrl: "https://example.test" },
    supabase: { createClient() {} },
    repositories,
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
      PropertyDeskAuthClient: {
        create(received) {
          calls.push(["auth-client", received]);
          return { id: "auth-client" };
        },
      },
      PropertyDeskRepositoryRegistry: {
        create(received) {
          calls.push(["repositories", received]);
          return repositoryAdapters;
        },
      },
      PropertyDeskWorkspaceTables: { properties: "pd_properties" },
      PropertyDeskWorkspaceQuery: {
        create(received) {
          calls.push(["query", received]);
          return workspaceQuery;
        },
      },
      PropertyDeskWorkspaceReadCatalog: {
        create(received) {
          calls.push(["read-catalog", received]);
          return workspaceReads;
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
  assert.equal(calls[2][0], "auth-client");
  assert.equal(calls[2][1].getClient(), null);
  assert.equal(calls[3][0], "repositories");
  assert.equal(calls[3][1].repositories, repositories);
  assert.equal(calls[3][1].getClient(), null);
  assert.equal(calls[4][0], "query");
  assert.equal(calls[4][1].getClient(), null);
  assert.equal(calls[5][0], "read-catalog");
  assert.equal(calls[5][1], context.window.PropertyDeskWorkspaceTables);
  assert.equal(calls[6][0], "data");
  assert.equal(calls[6][1].reads, workspaceReads);
  assert.equal(calls[6][1].workspaceQuery, workspaceQuery);
  assert.equal(calls[7][0], "refresh");
  assert.equal(calls[7][1].state, state);
  assert.equal(calls[7][1].workspaceData, workspaceData);
  assert.equal(calls[7][1].toast, options.toast);
  assert.equal(calls[7][1].render, options.render);
  assert.equal(runtime.isClientReady(), false);
  assert.equal(runtime.initializeClient(), client);
  assert.equal(calls[8][0], "create-client");
  assert.equal(calls[2][1].getClient(), client);
  assert.equal(calls[3][1].getClient(), client);
  assert.equal(runtime.isClientReady(), true);
  assert.equal(runtime.backendConfigured, true);
  assert.equal(runtime.state, state);
  assert.equal(runtime.fetchAll, fetchAll);
  assert.equal(runtime.loadAllWorkspacePages, workspaceQuery.loadAllPages);
  assert.equal(runtime.authClient.id, "auth-client");
  assert.equal(runtime.repositories, repositoryAdapters);
  assert.deepEqual(Object.keys(runtime).sort(), [
    "authClient",
    "backendConfigured",
    "fetchAll",
    "initializeClient",
    "isClientReady",
    "loadAllWorkspacePages",
    "repositories",
    "state",
  ]);
});
