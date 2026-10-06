const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("reminder activity model resolves account/property labels and delivery details", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "reminder-activity-model.js"),
      "utf8",
    ),
    context,
  );
  const state = {
    accounts: [
      { id: "a1", property_id: "p1", party_name: "Buyer" },
      { id: "a2", property_id: "missing", name: "Rental account" },
    ],
    properties: [{ id: "p1", address: "10 Main St" }],
    reminderLogs: [
      {
        account_id: "a1",
        reminder_month: "2026-10-01",
        recipient_index: 2,
        recipient_email: "private@example.test",
        status: "accepted",
        reason: null,
        unpaid_due: 550,
        attempted_at: "2026-10-31T12:00:00Z",
      },
      {
        account_id: "a2",
        reminder_month: "2026-10-01",
        status: "skipped",
        reason: "missing_recipient_email",
      },
      {
        account_id: "missing",
        reminder_month: "2026-10-01",
        status: "future_status",
        reason: "custom_reason",
      },
    ],
  };
  const model = context.window.PropertyDeskReminderActivityModel.create({
    state,
  });

  assert.deepEqual(JSON.parse(JSON.stringify(model.buildRows())), [
    {
      reminderMonth: "2026-10-01",
      propertyLabel: "10 Main St",
      accountLabel: "Buyer",
      recipientIndex: 2,
      status: "accepted",
      statusLabel: "Accepted by MailerSend",
      detail: "Month-end check",
      unpaidDue: 550,
      attemptedAt: "2026-10-31T12:00:00Z",
    },
    {
      reminderMonth: "2026-10-01",
      propertyLabel: "Property",
      accountLabel: "Rental account",
      status: "skipped",
      statusLabel: "Skipped",
      detail: "No valid recipient email is saved",
    },
    {
      reminderMonth: "2026-10-01",
      propertyLabel: "Property",
      accountLabel: "Account",
      status: "future_status",
      statusLabel: "Sending",
      detail: "custom_reason",
    },
  ]);
  assert.equal(
    JSON.stringify(model.buildRows()).includes("private@example.test"),
    false,
  );
});
