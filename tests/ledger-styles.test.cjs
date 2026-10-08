const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("transaction ledger styles stay in their feature stylesheet", () => {
  const root = path.join(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const shared = fs.readFileSync(path.join(root, "shared.css"), "utf8");
  const ledger = fs.readFileSync(path.join(root, "ledger.css"), "utf8");
  const theme = fs.readFileSync(path.join(root, "theme.css"), "utf8");
  const stylesheetOrder = [
    ...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g),
  ]
    .map((match) => match[0].match(/href="([^"]+)"/)?.[1])
    .filter(Boolean);

  assert.ok(
    stylesheetOrder.indexOf("ledger.css") >
      stylesheetOrder.indexOf("shared.css"),
  );
  assert.ok(
    stylesheetOrder.indexOf("ledger.css") <
      stylesheetOrder.indexOf("theme.css"),
  );
  assert.match(ledger, /\.expense-pill/);
  assert.match(ledger, /\.negative-amount/);
  assert.match(ledger, /\.transaction-voided/);
  assert.match(theme, /html\[data-theme="dark"\] \.expense-pill/);
  assert.doesNotMatch(
    shared,
    /\.expense-pill|\.negative-amount|\.transaction-voided/,
  );
});
