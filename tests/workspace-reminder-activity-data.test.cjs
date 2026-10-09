const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("workspace reminder activity projects only display fields on each read", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "features",
        "workspace-reminder-activity-data.js",
      ),
      "utf8",
    ),
    context,
  );
  const source = {
    accounts: [
      {
        id: "account-1",
        property_id: "property-1",
        party_name: "Buyer",
        name: "Land contract",
        party_email: "private@example.test",
      },
    ],
    properties: [
      {
        id: "property-1",
        address: "10 Main St",
        name: "Main St",
        owner_notes: "private note",
      },
    ],
    reminderLogs: [
      {
        account_id: "account-1",
        reminder_month: "2026-10-01",
        recipient_index: 1,
        status: "accepted",
        reason: null,
        unpaid_due: 550,
        attempted_at: "2026-10-31T12:00:00Z",
        recipient_email: "private@example.test",
      },
    ],
  };
  const projection =
    context.window.PropertyDeskWorkspaceReminderActivityData.create({
      getAccounts: () => source.accounts,
      getProperties: () => source.properties,
      getReminderLogs: () => source.reminderLogs,
    });
  const projected = projection.getActivityData();

  assert.deepEqual(Object.keys(projected.accounts[0]).sort(), [
    "id",
    "name",
    "party_name",
    "property_id",
  ]);
  assert.deepEqual(Object.keys(projected.properties[0]).sort(), [
    "address",
    "id",
    "name",
  ]);
  assert.deepEqual(Object.keys(projected.reminderLogs[0]).sort(), [
    "account_id",
    "attempted_at",
    "reason",
    "recipient_index",
    "reminder_month",
    "status",
    "unpaid_due",
  ]);
  assert.equal(
    JSON.stringify(projected).includes("private@example.test"),
    false,
  );
  assert.equal(JSON.stringify(projected).includes("private note"), false);
  source.accounts = [];
  assert.equal(projection.getActivityData().accounts.length, 0);
});
