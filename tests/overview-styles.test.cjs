const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("Overview property summary styles stay in their feature stylesheet", () => {
  const root = path.join(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const overrides = fs.readFileSync(path.join(root, "overrides.css"), "utf8");
  const overview = fs.readFileSync(path.join(root, "overview.css"), "utf8");
  const stylesheetOrder = [
    ...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g),
  ]
    .map((match) => match[0].match(/href="([^"]+)"/)?.[1])
    .filter(Boolean);

  assert.ok(
    stylesheetOrder.indexOf("overview.css") >
      stylesheetOrder.indexOf("overrides.css"),
  );
  assert.ok(
    stylesheetOrder.indexOf("overview.css") <
      stylesheetOrder.indexOf("theme.css"),
  );
  assert.match(overview, /\.property-summary-grid/);
  assert.match(overview, /\.property-quick-payment/);
  assert.match(overview, /\.property-party/);
  assert.doesNotMatch(
    overrides,
    /\.property-summary-grid|\.property-quick-payment|\.property-party/,
  );
});
