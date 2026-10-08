const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("property detail styles stay in their feature stylesheet", () => {
  const root = path.join(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const shared = fs.readFileSync(path.join(root, "shared.css"), "utf8");
  const theme = fs.readFileSync(path.join(root, "theme.css"), "utf8");
  const details = fs.readFileSync(
    path.join(root, "property-details.css"),
    "utf8",
  );
  const stylesheetOrder = [
    ...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g),
  ]
    .map((match) => match[0].match(/href="([^"]+)"/)?.[1])
    .filter(Boolean);

  assert.ok(
    stylesheetOrder.indexOf("property-details.css") >
      stylesheetOrder.indexOf("shared.css"),
  );
  assert.ok(
    stylesheetOrder.indexOf("property-details.css") <
      stylesheetOrder.indexOf("theme.css"),
  );
  assert.match(details, /\.property-detail-actions/);
  assert.match(details, /\.property-detail-table/);
  assert.match(details, /\.property-account-table table/);
  assert.match(details, /\.document-list/);
  assert.match(details, /\.holder-choices/);
  assert.doesNotMatch(
    shared,
    /\.property-detail-(?:actions|kpis|table)|\.document-list|\.document-row|\.document-name-link|\.holder-choices/,
  );
  assert.doesNotMatch(theme, /\.property-account-table/);
});
