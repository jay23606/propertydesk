const assert = require("node:assert/strict");
const test = require("node:test");

const mailerSendPromise =
  import("../supabase/functions/_shared/mailersend.mjs");

test("reminder sender builds a MailerSend request for only the current recipient", async () => {
  const { sendReminderEmail } = await mailerSendPromise;
  let request;
  const response = { status: 202, headers: new Headers() };
  const result = await sendReminderEmail({
    token: "test-token",
    fromEmail: "notifications@example.test",
    fromName: "PropertyDesk",
    recipient: "buyer@example.test",
    message: {
      subject: "Payment reminder",
      text: "Plain text message",
      html: "<p>HTML message</p>",
    },
    fetchImpl: async (url, options) => {
      request = { url, options };
      return response;
    },
  });

  assert.equal(result, response);
  assert.equal(request.url, "https://api.mailersend.com/v1/email");
  assert.equal(request.options.method, "POST");
  const headers = new Headers(request.options.headers);
  assert.equal(headers.get("authorization"), "Bearer test-token");
  assert.equal(headers.get("content-type"), "application/json");
  assert.equal(headers.get("accept"), "application/json");
  assert.deepEqual(JSON.parse(request.options.body), {
    from: { email: "notifications@example.test", name: "PropertyDesk" },
    to: [{ email: "buyer@example.test" }],
    subject: "Payment reminder",
    text: "Plain text message",
    html: "<p>HTML message</p>",
  });
});

test("reminder sender propagates provider request failures to the delivery workflow", async () => {
  const { sendReminderEmail } = await mailerSendPromise;
  await assert.rejects(
    sendReminderEmail({
      token: "test-token",
      fromEmail: "notifications@example.test",
      fromName: "PropertyDesk",
      recipient: "buyer@example.test",
      message: {
        subject: "Reminder",
        text: "Reminder",
        html: "<p>Reminder</p>",
      },
      fetchImpl: async () => {
        throw new Error("network unavailable");
      },
    }),
    /network unavailable/,
  );
});
