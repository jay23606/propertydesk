const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("theme styles are isolated, loaded last, and included in the PWA shell", () => {
  const root = path.join(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");
  const overrides = fs.readFileSync(path.join(root, "overrides.css"), "utf8");
  const reminders = fs.readFileSync(path.join(root, "reminders.css"), "utf8");
  const theme = fs.readFileSync(path.join(root, "theme.css"), "utf8");
  const stylesheetOrder = [
    ...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g),
  ]
    .map((match) => match[0].match(/href="([^"]+)"/)?.[1])
    .filter(Boolean);
  assert.ok(
    stylesheetOrder.indexOf("theme.css") >
      stylesheetOrder.indexOf("reminders.css"),
  );
  assert.match(theme, /html\[data-theme="dark"\]/);
  assert.match(theme, /\.reminder-status/);
  assert.doesNotMatch(styles, /html\[data-theme="dark"\]/);
  assert.doesNotMatch(overrides, /html\[data-theme="dark"\]/);
  assert.doesNotMatch(reminders, /html\[data-theme="dark"\]/);
});
