const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadCommitFeature() {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "import-commit.js"),
      "utf8",
    ),
    context,
  );
  return context.window.PropertyDeskImportCommit;
}

test("account and transaction imports share the commit refresh and result reporting", async () => {
  const rpcCalls = [];
  const refreshes = [];
  const messages = [];
  const status = {
    textContent: "",
    classList: { add: (name) => refreshes.push(name) },
  };
  const commit = loadCommitFeature().create({
    state: {
      client: {
        async rpc(name, args) {
          rpcCalls.push({ name, args });
          return { data: { rows_accepted: 1 }, error: null };
        },
      },
    },
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
  const commit = loadCommitFeature().create({
    state: {
      client: {
        async rpc() {
          return { data: null, error: new Error("database offline") };
        },
      },
    },
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
