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
    /\.portfolio-table th:nth-child\(1\),\s*\.portfolio-table td:nth-child\(1\)\s*\{\s*position: sticky;\s*left: 0;/,
    "mobile keeps only the first payment column pinned",
  );
  assert.doesNotMatch(
    portfolio,
    /\.portfolio-table (?:th|td):nth-child\([345]\)\s*\{[^}]*position: sticky/s,
    "the address and reminder columns scroll with the rest of the grid",
  );
  assert.match(
    portfolio,
    /\.portfolio-table td:nth-child\(1\) \.button\s*\{\s*width: 30px;\s*min-width: 30px;\s*height: 30px;\s*padding: 0;/,
  );
  assert.match(
    portfolio,
    /\.portfolio-table \.portfolio-payment-action\s*\{\s*margin-inline: auto;/,
  );
  assert.match(
    portfolio,
    /\.portfolio-table td:nth-child\(3\)\s*\{\s*min-width: 145px;/,
  );
  assert.match(
    portfolio,
    /html\[data-theme="dark"\] \.portfolio-table \.property-row-name,\s*html\[data-theme="dark"\] \.portfolio-table \.property-party-name\s*\{\s*color: #f1f7f2;/,
  );
  assert.doesNotMatch(styles, /\.portfolio-(?:panel|table|due)/);
  assert.doesNotMatch(shared, /\.portfolio-|\.property-row-note/);
  assert.doesNotMatch(theme, /\.portfolio-table|\.property-row-note/);
});
