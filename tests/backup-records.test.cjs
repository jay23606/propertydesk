const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("backup record loader paginates each workspace table into named records", async () => {
  const context = vm.createContext({ window: {} });
  const workspaceTables = require("../workspace-table-catalog.js");
  context.window.PropertyDeskWorkspaceTables = workspaceTables;
  context.window.PropertyDeskBackupUtils =
    require("../features/backup-utils.js").create({
      workspaceTables,
    });
  assert.deepEqual(
    Array.from(context.window.PropertyDeskBackupUtils.tables),
    Object.values(workspaceTables),
  );
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "workspace-query.js"), "utf8"),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "backup-records.js"),
      "utf8",
    ),
    context,
  );
  const backupRecords = context.window.PropertyDeskBackupRecords.create({
    tables: context.window.PropertyDeskBackupUtils.tables,
    loadAllPages: context.window.PropertyDeskWorkspaceQuery.loadAllPages,
  });

  const calls = [];
  const client = {
    from(table) {
      return {
        select(columns) {
          assert.equal(columns, "*");
          return {
            async range(from, to) {
              calls.push({ table, from, to });
              if (table !== "pd_payments") return { data: [], error: null };
              if (from === 0) {
                return {
                  data: Array.from({ length: 500 }, (_, index) => index),
                  error: null,
                };
              }
              return { data: [{ id: "last-payment" }], error: null };
            },
          };
        },
      };
    },
  };

  const records = await backupRecords.load(client);

  assert.equal(calls.length, backupRecords.tables.length + 1);
  assert.deepEqual(Array.from(records.pd_payments.slice(0, 2)), [0, 1]);
  assert.equal(records.pd_payments.length, 501);
  assert.equal(records.pd_payments.at(-1).id, "last-payment");
  assert.ok(backupRecords.tables.every((table) => table in records));
  assert.deepEqual(
    Array.from(backupRecords.tables),
    Object.values(workspaceTables),
  );
  const backup = context.window.PropertyDeskBackupUtils.createBackup(records);
  assert.deepEqual(backup.manifest.included_tables, backupRecords.tables);
  assert.ok(Array.isArray(backup.data.pd_reminder_logs));
});

test("backup record loader stops when a table query fails", async () => {
  const context = vm.createContext({ window: {} });
  context.window.PropertyDeskWorkspaceTables = require("../workspace-table-catalog.js");
  context.window.PropertyDeskBackupUtils =
    require("../features/backup-utils.js").create({
      workspaceTables: context.window.PropertyDeskWorkspaceTables,
    });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "workspace-query.js"), "utf8"),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "backup-records.js"),
      "utf8",
    ),
    context,
  );
  const backupRecords = context.window.PropertyDeskBackupRecords.create({
    tables: context.window.PropertyDeskBackupUtils.tables,
    loadAllPages: context.window.PropertyDeskWorkspaceQuery.loadAllPages,
  });

  await assert.rejects(
    backupRecords.load({
      from: () => ({
        select: () => ({
          range: async () => ({ data: null, error: new Error("offline") }),
        }),
      }),
    }),
    /offline/,
  );
});
