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
  const queryUtils = { insert() {} };
  const repositories = {
    accounts: { name: "account-repository" },
    queryUtils,
  };
  const repositoryAdapters = { accounts: { name: "accounts" } };
  const fetchAll = async () => {};
  const setRender = () => {};
  const reportError = () => {};
  const options = {
    config: { supabaseUrl: "https://example.test" },
    supabase: { createClient() {} },
    repositories,
    toast() {},
    reportError,
    tables: { properties: "pd_properties" },
    workflows: {},
  };
  const context = vm.createContext({
    window: {},
  });
  options.workflows = {
    backendClient: {
      create(received) {
        calls.push(["backend", received]);
        return backend;
      },
    },
    appState: {
      create() {
        calls.push(["state"]);
        return state;
      },
    },
    authClient: {
      create(received) {
        calls.push(["auth-client", received]);
        return { id: "auth-client" };
      },
    },
    repositoryRegistry: {
      create(received) {
        calls.push(["repositories", received]);
        return repositoryAdapters;
      },
    },
    query: {
      create(received) {
        calls.push(["query", received]);
        return workspaceQuery;
      },
    },
    readCatalog: {
      create(received) {
        calls.push(["read-catalog", received]);
        return workspaceReads;
      },
    },
    data: {
      create(received) {
        calls.push(["data", received]);
        return workspaceData;
      },
    },
    refresh: {
      create(received) {
        calls.push(["refresh", received]);
        return { fetchAll, setRender };
      },
    },
  };
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
  assert.equal(calls[3][1].queryUtils, queryUtils);
  assert.equal(calls[3][1].getClient(), null);
  assert.equal(calls[4][0], "query");
  assert.equal(calls[4][1].getClient(), null);
  assert.equal(calls[5][0], "read-catalog");
  assert.equal(calls[5][1], options.tables);
  assert.equal(calls[6][0], "data");
  assert.equal(calls[6][1].reads, workspaceReads);
  assert.equal(calls[6][1].workspaceQuery, workspaceQuery);
  assert.equal(calls[7][0], "refresh");
  assert.equal(calls[7][1].getUserId(), undefined);
  state.user = { id: "viewer-1" };
  assert.equal(calls[7][1].getUserId(), "viewer-1");
  calls[7][1].setWorkspaceRecords({ properties: [{ id: "property-1" }] });
  calls[7][1].setWorkspaceOwnerId("owner-1");
  assert.deepEqual(state.properties, [{ id: "property-1" }]);
  assert.equal(state.workspaceOwnerId, "owner-1");
  assert.deepEqual(Object.keys(calls[7][1]).sort(), [
    "getUserId",
    "reportError",
    "setWorkspaceOwnerId",
    "setWorkspaceRecords",
    "toast",
    "workspaceData",
  ]);
  assert.equal(calls[7][1].workspaceData, workspaceData);
  assert.equal(calls[7][1].toast, options.toast);
  assert.equal(calls[7][1].reportError, options.reportError);
  assert.equal("render" in calls[7][1], false);
  assert.equal(runtime.isClientReady(), false);
  assert.equal(runtime.initializeClient(), client);
  assert.equal(calls[8][0], "create-client");
  assert.equal(calls[2][1].getClient(), client);
  assert.equal(calls[3][1].getClient(), client);
  assert.equal(runtime.isClientReady(), true);
  assert.equal(runtime.getClient(), client);
  assert.equal(runtime.backendConfigured, true);
  assert.equal(runtime.state, state);
  assert.equal(runtime.fetchAll, fetchAll);
  assert.equal(runtime.setRender, setRender);
  assert.equal(runtime.loadAllWorkspacePages, workspaceQuery.loadAllPages);
  assert.equal(runtime.authClient.id, "auth-client");
  assert.equal(runtime.repositories, repositoryAdapters);
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  assert.doesNotMatch(
    app,
    /let appLifecycle|function render\(\) \{\s*appLifecycle\.render/,
  );
  assert.match(
    app,
    /const appLifecycle = window\.PropertyDeskAppStartupWorkflow\.create\([\s\S]*?\}\);\s*setWorkspaceRender\(appLifecycle\.render\);\s*document\.addEventListener\("DOMContentLoaded", appLifecycle\.initialize\);/,
  );
  assert.match(
    app,
    /const reportError = \(message, error\) =>\s*window\.console\?\.error\(message, error\);/,
  );
  assert.deepEqual(Object.keys(runtime).sort(), [
    "authClient",
    "backendConfigured",
    "fetchAll",
    "getClient",
    "initializeClient",
    "isClientReady",
    "loadAllWorkspacePages",
    "repositories",
    "setRender",
    "state",
  ]);
});
