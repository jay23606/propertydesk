const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("account financing form styles stay in their feature stylesheet", () => {
  const root = path.join(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const accountForm = fs.readFileSync(
    path.join(root, "account-form.css"),
    "utf8",
  );
  const theme = fs.readFileSync(path.join(root, "theme.css"), "utf8");
  const stylesheetOrder = [
    ...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g),
  ]
    .map((match) => match[0].match(/href="([^"]+)"/)?.[1])
    .filter(Boolean);

  assert.ok(
    stylesheetOrder.indexOf("account-form.css") >
      stylesheetOrder.indexOf("shared.css"),
  );
  assert.ok(
    stylesheetOrder.indexOf("account-form.css") <
      stylesheetOrder.indexOf("theme.css"),
  );
  assert.match(accountForm, /\.loan-fields/);
  assert.match(accountForm, /html\[data-theme="dark"\] \.loan-fields/);
  assert.doesNotMatch(theme, /\.loan-fields/);
});
