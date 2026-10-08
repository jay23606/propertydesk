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
  const theme = fs.readFileSync(path.join(root, "theme.css"), "utf8");
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
  assert.match(portfolio, /html\[data-theme="dark"\] \.portfolio-table/);
  assert.match(
    portfolio,
    /@media \(max-width: 760px\)[\s\S]*?\.portfolio-table th:nth-child\(5\),\s*\.portfolio-table td:nth-child\(5\)\s*\{\s*left: 250px;/,
    "mobile layout keeps the combined Payment/Due, Address, Email, and SMS columns visible",
  );
  assert.match(
    portfolio,
    /\.portfolio-table td:nth-child\(1\) \.button\s*\{\s*width: max-content;\s*padding: 4px 6px;/,
  );
  assert.match(
    portfolio,
    /\.portfolio-table td:nth-child\(3\)\s*\{[\s\S]*?width: 116px;/,
  );
  assert.doesNotMatch(styles, /\.portfolio-(?:panel|table|due)/);
  assert.doesNotMatch(shared, /\.portfolio-|\.property-row-note/);
  assert.doesNotMatch(theme, /\.portfolio-table|\.property-row-note/);
});
