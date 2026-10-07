const test = require("node:test");
const assert = require("node:assert/strict");
const { lateReminderMailto } = require("../features/email-utils.js");

function parts(href) {
  const url = new URL(href);
  return {
    recipients: url.pathname,
    subject: url.searchParams.get("subject"),
    body: url.searchParams.get("body"),
  };
}

test("late reminder link addresses the saved party and fills the requested subject and body", () => {
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
    body: "Hello Test Buyer,\n\nOur records show no rent or installment payment recorded for October 2026.\n\nUnpaid due as of 2026-10-31: $550.00\nProperty: 1 Sample Street\n\nIf you have already paid or believe this is incorrect, please contact your landlord or seller.\n\nThank you,\nProperty Manager",
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
  assert.match(
    noEmail.body,
    /^Hello there,\n\nOur records show no rent or installment payment recorded for /,
  );
  assert.match(
    noEmail.body,
    /Unpaid due as of \d{4}-\d{2}-\d{2}: \$75\.00\nProperty: 10 Oak St/,
  );
  assert.ok(noEmail.body.endsWith("\n\nThank you,\nOwner"));
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
  assert.doesNotMatch(
    views,
    /class="table-action" data-detail="\$\{esc\(account\.id\)\}">${esc\(account\.party_name/,
  );
  assert.ok(html.indexOf("features/email-utils.js") < html.indexOf("app.js"));
  assert.ok(
    html.indexOf("features/property-views.js") < html.indexOf("app.js"),
  );
  assert.match(worker, /'\.\/features\/email-utils\.js'/);
  assert.match(worker, /'\.\/features\/property-views\.js'/);
});
