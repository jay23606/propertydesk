const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("backup record loader paginates each workspace table into named records", async () => {
  const context = vm.createContext({ window: {} });
  context.window.PropertyDeskBackupUtils = require("../backup-utils.js");
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

  const records = await context.window.PropertyDeskBackupRecords.load(client);

  assert.equal(
    calls.length,
    context.window.PropertyDeskBackupRecords.tables.length + 1,
  );
  assert.deepEqual(Array.from(records.pd_payments.slice(0, 2)), [0, 1]);
  assert.equal(records.pd_payments.length, 501);
  assert.equal(records.pd_payments.at(-1).id, "last-payment");
  assert.ok(
    context.window.PropertyDeskBackupRecords.tables.every(
      (table) => table in records,
    ),
  );
  const backup = context.window.PropertyDeskBackupUtils.createBackup(records);
  assert.deepEqual(
    backup.manifest.included_tables,
    context.window.PropertyDeskBackupRecords.tables,
  );
  assert.ok(Array.isArray(backup.data.pd_reminder_logs));
});

test("backup record loader stops when a table query fails", async () => {
  const context = vm.createContext({ window: {} });
  context.window.PropertyDeskBackupUtils = require("../backup-utils.js");
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

  await assert.rejects(
    context.window.PropertyDeskBackupRecords.load({
      from: () => ({
        select: () => ({
          range: async () => ({ data: null, error: new Error("offline") }),
        }),
      }),
    }),
    /offline/,
  );
});
