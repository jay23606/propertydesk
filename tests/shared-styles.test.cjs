const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("shared component styles load after the base and before feature styles", () => {
  const root = path.join(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const shared = fs.readFileSync(path.join(root, "shared.css"), "utf8");
  const theme = fs.readFileSync(path.join(root, "theme.css"), "utf8");
  const stylesheetOrder = [
    ...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g),
  ]
    .map((match) => match[0].match(/href="([^"]+)"/)?.[1])
    .filter(Boolean);

  assert.ok(
    stylesheetOrder.indexOf("shared.css") >
      stylesheetOrder.indexOf("styles.css"),
  );
  assert.ok(
    stylesheetOrder.indexOf("portfolio.css") >
      stylesheetOrder.indexOf("shared.css"),
  );
  assert.match(shared, /\.heading-actions/);
  assert.match(shared, /\.audit-list/);
  assert.match(shared, /\.table-subtext/);
  for (const selector of [
    ".status-pill",
    ".kind-pill",
    ".table-subtext",
    ".detail-kpi",
    ".detail-section",
    ".schedule-table",
  ]) {
    assert.ok(shared.includes(`html[data-theme="dark"] ${selector}`));
    assert.ok(!theme.includes(selector));
  }
});
