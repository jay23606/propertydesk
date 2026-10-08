const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("Properties grid styles stay in their feature stylesheet", () => {
  const root = path.join(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");
  const shared = fs.readFileSync(path.join(root, "shared.css"), "utf8");
  const portfolio = fs.readFileSync(path.join(root, "portfolio.css"), "utf8");
  const stylesheetOrder = [
    ...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g),
  ]
    .map((match) => match[0].match(/href="([^"]+)"/)?.[1])
    .filter(Boolean);

  assert.ok(
    stylesheetOrder.indexOf("portfolio.css") >
      stylesheetOrder.indexOf("shared.css"),
  );
  assert.ok(
    stylesheetOrder.indexOf("portfolio.css") <
      stylesheetOrder.indexOf("reminders.css"),
  );
  assert.match(portfolio, /\.portfolio-panel/);
  assert.match(portfolio, /\.portfolio-table/);
  assert.match(portfolio, /\.property-row-note/);
  assert.doesNotMatch(styles, /\.portfolio-(?:panel|table|due)/);
  assert.doesNotMatch(shared, /\.portfolio-|\.property-row-note/);
});
