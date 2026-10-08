const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadModule(getClient = () => null) {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "workspace-table-catalog.js"),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "workspace-read-catalog.js"),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "workspace-query.js"), "utf8"),
    context,
  );
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "workspace-data.js"), "utf8"),
    context,
  );
  const workspaceQuery = context.window.PropertyDeskWorkspaceQuery.create({
    getClient,
  });
  const reads = context.window.PropertyDeskWorkspaceReadCatalog.create(
    context.window.PropertyDeskWorkspaceTables,
  );
  return context.window.PropertyDeskWorkspaceData.create({
    reads,
    workspaceQuery,
  });
}

test("workspace data delegates active workspace lookup to its data adapter", async () => {
  const calls = [];
  const client = {
    rpc: async (name) => {
      calls.push(name);
      return { data: "workspace-1", error: null };
    },
  };

  const result = await loadModule(() => client).loadWorkspaceId();

  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    data: "workspace-1",
    error: null,
  });
  assert.deepEqual(calls, ["pd_workspace_id"]);
});

test("workspace query resolves the active client when each read starts", async () => {
  const client = {
    rpc: async (name) => ({ data: name, error: null }),
  };
  let activeClient = null;
  const workspaceData = loadModule(() => activeClient);

  activeClient = client;
  const result = await workspaceData.loadWorkspaceId();

  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    data: "pd_workspace_id",
    error: null,
  });
});

test("workspace data reads every owner table in parallel and maps named results", async () => {
  const requests = [];
  const rpcCalls = [];
  const client = {
    from(table) {
      const operations = [];
      const query = {
        select(columns) {
          operations.push(["select", columns]);
          return query;
        },
        eq(column, value) {
          operations.push(["eq", column, value]);
          return query;
        },
        order(column, options) {
          operations.push(["order", column, options]);
          return query;
        },
        limit(value) {
          operations.push(["limit", value]);
          return query;
        },
        then(resolve, reject) {
          requests.push({ table, operations });
          return Promise.resolve({ data: [table], error: null }).then(
            resolve,
            reject,
          );
        },
      };
      return query;
    },
    rpc(name) {
      rpcCalls.push(name);
      return Promise.resolve({ data: ["member"], error: null });
    },
  };

  const records = await loadModule(() => client).loadWorkspaceRecords(
    "workspace-1",
  );

  assert.equal(records.properties[0], "pd_properties");
  assert.equal(records.payments[0], "pd_payments");
  assert.equal(records.workspaceMembers[0], "member");
  assert.equal(requests.length, 10);
  assert.deepEqual(rpcCalls, ["pd_list_workspace_members"]);
  for (const { table, operations } of requests) {
    assert.ok(
      operations.some(
        ([operation, column, value]) =>
          operation === "eq" && column === "user_id" && value === "workspace-1",
      ),
      `${table} should be filtered to the active workspace`,
    );
  }
  const expectedOrders = {
    pd_properties: ["created_at"],
    pd_accounts: ["created_at"],
    pd_payments: ["received_date", "recorded_at"],
    pd_expenses: ["expense_date", "recorded_at"],
    pd_import_batches: ["created_at"],
    pd_documents: ["created_at"],
    pd_agreement_versions: ["replaced_on"],
    pd_property_holders: [],
    pd_deposit_entries: ["movement_date", "created_at"],
    pd_reminder_logs: ["attempted_at"],
  };
  for (const { table, operations } of requests) {
    const actualOrders = operations
      .filter(([operation]) => operation === "order")
      .map(([, column, options]) => [column, options.ascending]);
    assert.deepEqual(
      actualOrders,
      expectedOrders[table].map((column) => [column, false]),
      `${table} retains its display ordering`,
    );
  }
  assert.ok(
    requests
      .find((request) => request.table === "pd_reminder_logs")
      .operations.some(
        ([operation, value]) => operation === "limit" && value === 300,
      ),
  );
});

test("workspace data loading rejects the first database error", async () => {
  const failure = new Error("Database unavailable");
  const client = {
    from(table) {
      const query = {
        select() {
          return query;
        },
        eq() {
          return query;
        },
        order() {
          return query;
        },
        limit() {
          return query;
        },
        then(resolve, reject) {
          const result =
            table === "pd_accounts"
              ? { data: null, error: failure }
              : { data: [], error: null };
          return Promise.resolve(result).then(resolve, reject);
        },
      };
      return query;
    },
    rpc: async () => ({ data: [], error: null }),
  };

  await assert.rejects(
    () => loadModule(() => client).loadWorkspaceRecords("workspace-1"),
    (error) => error === failure,
  );
});

test("workspace data modules load before app root and are precached", () => {
  const html = fs.readFileSync(
    path.join(__dirname, "..", "index.html"),
    "utf8",
  );
  const worker = fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8");
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  const runtime = fs.readFileSync(
    path.join(__dirname, "..", "features", "workspace-runtime.js"),
    "utf8",
  );
  assert.ok(html.indexOf("workspace-data.js") < html.indexOf("app.js"));
  assert.ok(
    html.indexOf("workspace-table-catalog.js") <
      html.indexOf("workspace-data.js"),
  );
  assert.ok(
    html.indexOf("workspace-read-catalog.js") <
      html.indexOf("workspace-data.js"),
  );
  assert.ok(
    html.indexOf("workspace-query.js") < html.indexOf("workspace-data.js"),
  );
  assert.match(worker, /'\.\/workspace-table-catalog\.js'/);
  assert.ok(
    worker.indexOf("./workspace-table-catalog.js") <
      worker.indexOf("./workspace-data.js"),
  );
  assert.match(worker, /'\.\/workspace-read-catalog\.js'/);
  assert.ok(
    worker.indexOf("./workspace-read-catalog.js") <
      worker.indexOf("./workspace-data.js"),
  );
  assert.match(worker, /'\.\/workspace-query\.js'/);
  assert.ok(
    worker.indexOf("./workspace-query.js") <
      worker.indexOf("./workspace-data.js"),
  );
  assert.match(worker, /'\.\/workspace-data\.js'/);
  assert.ok(
    html.indexOf("features/workspace-refresh.js") < html.indexOf("app.js"),
  );
  assert.ok(
    html.indexOf("features/workspace-runtime.js") < html.indexOf("app.js"),
  );
  assert.match(worker, /'\.\/features\/workspace-refresh\.js'/);
  assert.match(worker, /'\.\/features\/workspace-runtime\.js'/);
  assert.match(app, /PropertyDeskWorkspaceRuntime\.create\(/);
  assert.match(runtime, /PropertyDeskWorkspaceQuery\.create\(\{/);
  assert.match(runtime, /PropertyDeskWorkspaceData\.create\(\{/);
  assert.match(runtime, /PropertyDeskWorkspaceRefresh\.create\(/);
  assert.match(
    runtime,
    /PropertyDeskWorkspaceRefresh\.create\(\{\s*state,\s*workspaceData,/,
  );
});
