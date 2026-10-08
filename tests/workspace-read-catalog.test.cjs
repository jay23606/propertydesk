const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("workspace read catalog lists each hydrated record source once", () => {
  const root = path.join(__dirname, "..");
  const context = vm.createContext({ window: {} });
  const tables = require(path.join(root, "workspace-table-catalog.js"));
  vm.runInContext(
    fs.readFileSync(path.join(root, "workspace-read-catalog.js"), "utf8"),
    context,
  );

  const reads = context.window.PropertyDeskWorkspaceReadCatalog.create(tables);

  assert.deepEqual(JSON.parse(JSON.stringify(reads.map((read) => read.key))), [
    "properties",
    "accounts",
    "payments",
    "expenses",
    "importBatches",
    "documents",
    "agreementVersions",
    "propertyHolders",
    "workspaceMembers",
    "depositEntries",
    "reminderLogs",
  ]);
  assert.equal(
    reads.find((read) => read.key === "workspaceMembers").rpc,
    "pd_list_workspace_members",
  );
  assert.equal(reads.find((read) => read.key === "reminderLogs").limit, 300);
  assert.equal(Object.isFrozen(reads), true);
});
