const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("Overview property summary styles stay in their feature stylesheet", () => {
  const root = path.join(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");
  const shared = fs.readFileSync(path.join(root, "shared.css"), "utf8");
  const overview = fs.readFileSync(path.join(root, "overview.css"), "utf8");
  const theme = fs.readFileSync(path.join(root, "theme.css"), "utf8");
  const stylesheetOrder = [
    ...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g),
  ]
    .map((match) => match[0].match(/href="([^"]+)"/)?.[1])
    .filter(Boolean);

  assert.ok(
    stylesheetOrder.indexOf("overview.css") >
      stylesheetOrder.indexOf("shared.css"),
  );
  assert.ok(
    stylesheetOrder.indexOf("overview.css") <
      stylesheetOrder.indexOf("theme.css"),
  );
  assert.match(overview, /\.property-summary-grid/);
  assert.match(overview, /\.property-quick-payment/);
  assert.match(overview, /\.property-party/);
  assert.match(overview, /\.overview-grid/);
  assert.match(overview, /\.list-body/);
  assert.match(overview, /\.round-icon/);
  assert.match(overview, /\.row-right/);
  assert.match(overview, /html\[data-theme="dark"\] \.round-icon/);
  assert.doesNotMatch(styles, /\.overview-grid/);
  assert.doesNotMatch(styles, /\.list-body|\.round-icon|\.row-right/);
  assert.match(overview, /html\[data-theme="dark"\] \.property-art/);
  assert.doesNotMatch(
    shared,
    /\.property-summary-grid|\.property-quick-payment|\.property-party/,
  );
  assert.doesNotMatch(
    theme,
    /\.property-art|\.property-building|\.property-type/,
  );
});
