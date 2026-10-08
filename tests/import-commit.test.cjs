const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadCommitFeature() {
  const context = vm.createContext({ window: {} });
  for (const source of [
    "workspace-write-reconciliation.js",
    "repository-write-feedback.js",
    "import-repository.js",
    "import-commit.js",
  ]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", source), "utf8"),
      context,
    );
  }
  return {
    commit: context.window.PropertyDeskImportCommit,
    repository: context.window.PropertyDeskImportRepository,
  };
}

test("account and transaction imports share the commit refresh and result reporting", async () => {
  const rpcCalls = [];
  const refreshes = [];
  const messages = [];
  const status = {
    textContent: "",
    classList: { add: (name) => refreshes.push(name) },
  };
  const client = {
    async rpc(name, args) {
      rpcCalls.push({ name, args });
      return { data: { rows_accepted: 1 }, error: null };
    },
  };
  const { commit: feature, repository } = loadCommitFeature();
  const commit = feature.create({
    repository: repository.create({ getClient: () => client }),
    fetchAll: async () => refreshes.push("workspace refreshed"),
    status,
    toast: (message) => messages.push(message),
  });

  await commit.commitAccounts({
    rows: [{ account_name: "Buyer" }, { account_name: "Tenant" }],
    sourceName: "accounts.csv",
    total: 2,
  });
  assert.match(status.textContent, /Imported 1 account; 1 row was skipped/);
  assert.equal(messages[0], "Import complete");

  await commit.commitTransactions({
    kind: "payments",
    rows: [{ amount: 700 }],
    sourceName: "payments.csv",
    total: 1,
    label: "payment",
  });
  assert.match(status.textContent, /Imported 1 payment; 0 rows were skipped/);
  assert.equal(messages[1], "Payment import complete");
  assert.deepEqual(JSON.parse(JSON.stringify(rpcCalls)), [
    {
      name: "pd_import_propertydesk_accounts",
      args: {
        p_rows: [{ account_name: "Buyer" }, { account_name: "Tenant" }],
        p_source_name: "accounts.csv",
        p_rows_total: 2,
      },
    },
    {
      name: "pd_import_propertydesk_transactions",
      args: {
        p_kind: "payments",
        p_rows: [{ amount: 700 }],
        p_source_name: "payments.csv",
        p_rows_total: 1,
      },
    },
  ]);
  assert.equal(
    refreshes.filter((value) => value === "workspace refreshed").length,
    2,
  );
  assert.equal(refreshes.filter((value) => value === "success").length, 2);
});

test("failed import commits do not refresh or report success", async () => {
  const messages = [];
  let refreshCount = 0;
  const client = {
    async rpc() {
      return { data: null, error: new Error("database offline") };
    },
  };
  const { commit: feature, repository } = loadCommitFeature();
  const commit = feature.create({
    repository: repository.create({ getClient: () => client }),
    fetchAll: async () => refreshCount++,
    status: { textContent: "", classList: { add() {} } },
    toast: (message) => messages.push(message),
  });

  await assert.rejects(
    commit.commitAccounts({ rows: [], sourceName: "accounts.csv", total: 0 }),
    /database offline/,
  );
  assert.equal(refreshCount, 0);
  assert.deepEqual(messages, []);
});

test("a confirmed import distinguishes refresh failure from save failure", async () => {
  const messages = [];
  const status = {
    textContent: "",
    classList: { add() {} },
  };
  const client = {
    async rpc() {
      return { data: { rows_accepted: 1 }, error: null };
    },
  };
  const { commit: feature, repository } = loadCommitFeature();
  const commit = feature.create({
    repository: repository.create({ getClient: () => client }),
    fetchAll: async () => {
      throw new Error("workspace refresh failed");
    },
    status,
    toast: (message) => messages.push(message),
  });

  await assert.rejects(
    commit.commitTransactions({
      kind: "payments",
      rows: [{ amount: 550 }],
      sourceName: "payments.csv",
      total: 1,
      label: "payment",
    }),
    (error) => {
      assert.equal(error.importPersisted, true);
      assert.match(error.message, /workspace refresh failed/i);
      return true;
    },
  );
  assert.match(status.textContent, /Imported 1 payment/);
  assert.deepEqual(messages, []);
});

test("an import with a lost response reconciles from the new committed batch", async () => {
  const messages = [];
  const refreshes = [];
  const state = {
    workspaceOwnerId: "workspace-1",
    importBatches: [],
    accounts: [],
  };
  const status = {
    textContent: "",
    classList: { add: (name) => refreshes.push(name) },
  };
  const { commit: feature } = loadCommitFeature();
  const commit = feature.create({
    state,
    repository: {
      commitAccounts: async () => {
        throw new Error("connection lost");
      },
      commitTransactions: async () => assert.fail("wrong import method"),
    },
    fetchAll: async () => {
      state.importBatches = [
        {
          id: "batch-1",
          user_id: "workspace-1",
          source_type: "csv",
          source_name: "accounts.csv",
          status: "committed",
          rows_total: 2,
          rows_accepted: 2,
        },
      ];
      state.accounts = [{ import_batch_id: "batch-1" }];
      refreshes.push("workspace");
    },
    status,
    toast: (message) => messages.push(message),
  });

  await commit.commitAccounts({
    rows: [{ account_name: "Buyer" }, { account_name: "Tenant" }],
    sourceName: "accounts.csv",
    total: 2,
  });

  assert.match(status.textContent, /Imported 2 accounts; 0 rows were skipped/);
  assert.deepEqual(refreshes, ["workspace", "success"]);
  assert.deepEqual(messages, ["Import complete"]);
});

test("an unconfirmed import stays unresolved when refreshed history has no batch", async () => {
  const messages = [];
  const state = {
    workspaceOwnerId: "workspace-1",
    importBatches: [],
  };
  const { commit: feature } = loadCommitFeature();
  const commit = feature.create({
    state,
    repository: {
      commitAccounts: async () => {
        throw new Error("connection lost");
      },
      commitTransactions: async () => assert.fail("wrong import method"),
    },
    fetchAll: async () => {},
    status: { textContent: "", classList: { add() {} } },
    toast: (message) => messages.push(message),
  });

  await assert.rejects(
    commit.commitAccounts({
      rows: [{ account_name: "Buyer" }],
      sourceName: "accounts.csv",
      total: 1,
    }),
    /no matching completed batch appeared/i,
  );
  assert.deepEqual(messages, []);
});

test("database import errors keep their specific message without reconciliation", async () => {
  let refreshes = 0;
  const databaseError = Object.assign(new Error("Account row is invalid"), {
    code: "P0001",
  });
  const { commit: feature } = loadCommitFeature();
  const commit = feature.create({
    state: { workspaceOwnerId: "workspace-1", importBatches: [] },
    repository: {
      commitAccounts: async () => {
        throw databaseError;
      },
      commitTransactions: async () => assert.fail("wrong import method"),
    },
    fetchAll: async () => refreshes++,
    status: { textContent: "", classList: { add() {} } },
    toast() {},
  });

  await assert.rejects(
    commit.commitAccounts({
      rows: [{ account_name: "Buyer" }],
      sourceName: "accounts.csv",
      total: 1,
    }),
    (error) => error === databaseError,
  );
  assert.equal(refreshes, 0);
});
