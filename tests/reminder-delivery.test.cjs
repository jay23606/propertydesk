const assert = require("node:assert/strict");
const test = require("node:test");

const deliveryPromise =
  import("../supabase/functions/_shared/reminder-delivery.mjs");

const account = { id: "account-1", user_id: "owner-1" };
const property = { id: "property-1", address: "10 Main St" };
const base = {
  account,
  property,
  accountPayments: [],
  recipient: "buyer@example.test",
  recipientIndex: 1,
  reminderMonth: "2026-10-01",
  monthStart: "2026-10-01",
  monthEnd: "2026-10-31",
  unpaidDue: 550,
  reminderLog: {
    recordSkipped: async () => {},
    claim: async () => "log-1",
    saveResult: async () => {},
  },
  reminderMessage: (...args) => ({ args }),
  sendReminderEmail: async () => ({ status: 202, headers: new Headers() }),
  mailerSendToken: "test-token",
  fromEmail: "notifications@example.test",
  fromName: "PropertyDesk",
  now: () => new Date("2026-10-31T12:00:00.000Z"),
};

test("delivery records missing recipients without claiming or sending", async () => {
  const { deliverReminderRecipient } = await deliveryPromise;
  let skippedRow;
  const result = await deliverReminderRecipient({
    ...base,
    recipient: null,
    recipientIndex: 0,
    reminderLog: {
      ...base.reminderLog,
      recordSkipped: async (row) => (skippedRow = row),
      claim: async () => assert.fail("skipped reminder must not be claimed"),
    },
    sendReminderEmail: async () => assert.fail("must not send without email"),
  });

  assert.equal(result, "skipped");
  assert.equal(skippedRow.status, "skipped");
  assert.equal(skippedRow.reason, "missing_recipient_email");
  assert.equal(skippedRow.attempted_at, "2026-10-31T12:00:00.000Z");
});

test("delivery skips recipients after a qualifying current-month payment", async () => {
  const { deliverReminderRecipient } = await deliveryPromise;
  let skippedReason;
  const result = await deliverReminderRecipient({
    ...base,
    accountPayments: [
      {
        status: "posted",
        income_category: "rent",
        received_date: "2026-10-05",
      },
    ],
    reminderLog: {
      ...base.reminderLog,
      recordSkipped: async (row) => (skippedReason = row.reason),
      claim: async () => assert.fail("paid account must not be claimed"),
    },
    sendReminderEmail: async () => assert.fail("paid account must not send"),
  });

  assert.equal(result, "skipped");
  assert.equal(skippedReason, "payment_recorded_this_month");
});

test("delivery builds, sends, and records an accepted reminder", async () => {
  const { deliverReminderRecipient } = await deliveryPromise;
  const calls = [];
  const message = {
    subject: "Reminder",
    text: "Due: $550",
    html: "<p>Due</p>",
  };
  const result = await deliverReminderRecipient({
    ...base,
    reminderLog: {
      ...base.reminderLog,
      claim: async (row) => {
        calls.push(["claim", row]);
        return "log-1";
      },
      saveResult: async (id, values) => calls.push(["save", id, values]),
    },
    reminderMessage: (...args) => {
      calls.push(["message", ...args]);
      return message;
    },
    sendReminderEmail: async (options) => {
      calls.push(["send", options]);
      return {
        status: 202,
        headers: new Headers({ "x-message-id": "provider-1" }),
      };
    },
  });

  assert.equal(result, "accepted");
  assert.deepEqual(
    calls.map(([type]) => type),
    ["claim", "message", "send", "save"],
  );
  assert.deepEqual(calls[1], [
    "message",
    account,
    property,
    "2026-10-01",
    "2026-10-31",
    550,
  ]);
  assert.equal(calls[2][1].recipient, "buyer@example.test");
  assert.equal(calls[2][1].message, message);
  assert.deepEqual(calls[3], [
    "save",
    "log-1",
    {
      status: "accepted",
      reason: null,
      provider_message_id: "provider-1",
    },
  ]);
});

test("delivery records provider HTTP failures and failed log claims are ignored", async () => {
  const { deliverReminderRecipient } = await deliveryPromise;
  let saved;
  const failed = await deliverReminderRecipient({
    ...base,
    reminderLog: {
      ...base.reminderLog,
      saveResult: async (id, values) => (saved = { id, values }),
    },
    sendReminderEmail: async () => ({
      status: 503,
      headers: new Headers(),
    }),
  });
  assert.equal(failed, "failed");
  assert.deepEqual(saved, {
    id: "log-1",
    values: { status: "failed", reason: "mailersend_http_503" },
  });

  const alreadyHandled = await deliverReminderRecipient({
    ...base,
    reminderLog: { ...base.reminderLog, claim: async () => null },
    sendReminderEmail: async () => assert.fail("duplicate must not send"),
  });
  assert.equal(alreadyHandled, "already_handled");
});
