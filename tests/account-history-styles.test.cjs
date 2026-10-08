const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("account history styles stay with the account history feature", () => {
  const root = path.join(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const shared = fs.readFileSync(path.join(root, "shared.css"), "utf8");
  const history = fs.readFileSync(
    path.join(root, "account-history.css"),
    "utf8",
  );
  const stylesheetOrder = [
    ...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g),
  ]
    .map((match) => match[0].match(/href="([^"]+)"/)?.[1])
    .filter(Boolean);

  assert.match(history, /\.audit-list/);
  assert.match(history, /\.audit-row/);
  assert.match(history, /html\[data-theme="dark"\] \.audit-row/);
  assert.match(history, /html\[data-theme="dark"\] \.audit-row small/);
  assert.match(history, /html\[data-theme="dark"\] \.audit-row time/);
  assert.doesNotMatch(shared, /\.audit-list|\.audit-row/);
  assert.ok(
    stylesheetOrder.indexOf("account-history.css") >
      stylesheetOrder.indexOf("account-form.css"),
  );
  assert.ok(
    stylesheetOrder.indexOf("account-history.css") <
      stylesheetOrder.indexOf("theme.css"),
  );
});
