const test = require("node:test");
const assert = require("node:assert/strict");
const {
  lateReminderMailto,
  lateReminderSms,
} = require("./email-utils-helper.cjs");

function parts(href) {
  const url = new URL(href);
  return {
    recipients: url.pathname,
    subject: url.searchParams.get("subject"),
    body: url.searchParams.get("body"),
  };
}

test("late reminder email uses the requested payment reminder copy", () => {
  const href = lateReminderMailto({
    email: "buyer@example.test",
    address: "1 Sample Street",
    unpaidDue: "$550.00",
    senderName: "Property Manager",
    recipientName: "Test Buyer",
    month: "October 2026",
    asOf: "2026-10-31",
  });

  assert.deepEqual(parts(href), {
    recipients: "buyer@example.test",
    subject: "Payment reminder for 1 Sample Street · October 2026",
    body: "Hi Test Buyer,\n\nOur records show $550.00 unpaid for 1 Sample Street (tracked since October 2026; earlier balances or late fees may not be included).\n\nPlease arrange payment promptly or contact me with questions.\n\nThanks!",
  });
});

test("late reminder link supports multiple validated recipients and leaves missing recipients blank", () => {
  const multiple = parts(
    lateReminderMailto({
      email: "one@example.com; two@example.com",
      address: "10 Oak St",
      unpaidDue: "$75.00",
      senderName: "Owner",
    }),
  );
  assert.equal(multiple.recipients, "one@example.com,two@example.com");

  const noEmail = parts(
    lateReminderMailto({
      email: "not-an-email",
      address: "10 Oak St",
      unpaidDue: "$75.00",
      senderName: "Owner",
    }),
  );
  assert.equal(noEmail.recipients, "");
  assert.match(noEmail.subject, /^Payment reminder for 10 Oak St · /);
  assert.equal(
    noEmail.body,
    "Hi there,\n\nOur records show $75.00 unpaid for 10 Oak St (tracked since October 2026; earlier balances or late fees may not be included).\n\nPlease arrange payment promptly or contact me with questions.\n\nThanks!",
  );
});

test("shared reminder copy falls back to a generic greeting for a blank name", () => {
  const message = lateReminderMailto({
    email: "buyer@example.test",
    address: "10 Oak St",
    unpaidDue: "$75.00",
    recipientName: "   ",
    month: "October 2026",
    asOf: "2026-10-31",
  });

  assert.match(parts(message).body, /^Hi there,\n\nOur records show/);
});

test("late reminder text link opens the phone composer with the same reminder body", () => {
  const href = lateReminderSms({
    phone: "+1 (555) 010-2020",
    address: "1 Sample Street",
    unpaidDue: "$550.00",
    senderName: "Property Manager",
    recipientName: "Test Buyer",
    month: "October 2026",
    asOf: "2026-10-31",
  });
  const url = new URL(href);

  assert.equal(url.protocol, "sms:");
  assert.equal(url.pathname, "+15550102020");
  assert.equal(
    url.searchParams.get("body"),
    "Hi Test Buyer,\n\nOur records show $550.00 unpaid for 1 Sample Street (tracked since October 2026; earlier balances or late fees may not be included).\n\nPlease arrange payment promptly or contact me with questions.\n\nThanks!\nProperty Manager",
  );
  assert.equal(lateReminderSms({ phone: "   " }), "");
});

test("the app renders the account holder as a mailto link instead of an account-details button", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const views = fs.readFileSync(
    path.join(__dirname, "..", "features", "property-portfolio-table.js"),
    "utf8",
  );
  const html = fs.readFileSync(
    path.join(__dirname, "..", "index.html"),
    "utf8",
  );
  const worker = fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8");

  assert.match(views, /href="\$\{esc\(reminderHref\)\}"/);
  assert.match(views, /href="\$\{esc\(textReminderHref\)\}"/);
  assert.match(views, /Draft text reminder for \$\{partyName\}/);
  assert.doesNotMatch(
    views,
    /class="table-action" data-detail="\$\{esc\(account\.id\)\}">${esc\(account\.party_name/,
  );
  assert.ok(
    html.indexOf("supabase/functions/_shared/reminder-copy.js") <
      html.indexOf("features/email-utils.js"),
  );
  assert.ok(html.indexOf("features/email-utils.js") < html.indexOf("app.js"));
  assert.ok(
    html.indexOf("features/property-views.js") < html.indexOf("app.js"),
  );
  assert.match(worker, /\.\/supabase\/functions\/_shared\/reminder-copy\.js/);
  assert.match(worker, /'\.\/features\/email-utils\.js'/);
  assert.match(html, /features\/email-utils\.js\?v=reminder-copy-r6/);
  assert.match(worker, /'\.\/features\/property-views\.js'/);
});
