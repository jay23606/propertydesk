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
  assert.match(
    portfolio,
    /\.portfolio-table\s*\{\s*box-sizing: border-box;\s*width: 100vw;\s*margin-inline: calc\(50% - 50vw\);\s*border-radius: 0;/,
    "mobile grid reaches both screen edges without side gutters",
  );
  assert.match(
    portfolio,
    /\.portfolio-table table\s*\{\s*width: 100%;\s*min-width: 100%;\s*table-layout: fixed;/,
    "mobile table assigns the first five visible columns to the screen width",
  );
  assert.match(portfolio, /\.property-row-note/);
  assert.match(html, /class="portfolio-mobile-payment-heading"\s*>DUE \/ PAY/);
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
    /\.portfolio-table th:nth-child\(1\),\s*\.portfolio-table td:nth-child\(1\)\s*\{\s*position: sticky;\s*left: 0;\s*width: 14vw;\s*min-width: 14vw;/,
  );
  assert.match(
    portfolio,
    /\.portfolio-table \.portfolio-icon-action\s*\{\s*width: 28px;\s*height: 28px;/,
  );
  assert.match(
    portfolio,
    /\.portfolio-table td\.portfolio-contact-action\s*\{\s*width: 7\.5vw;\s*min-width: 7\.5vw;\s*max-width: 7\.5vw;/,
    "mobile keeps the Email and SMS action columns compact",
  );
  assert.match(
    portfolio,
    /\.portfolio-table \.portfolio-payment-action\s*\{\s*margin-inline: auto;/,
  );
  assert.match(
    portfolio,
    /\.portfolio-table th:nth-child\(3\),\s*\.portfolio-table td:nth-child\(3\)\s*\{\s*width: 30vw;\s*min-width: 30vw;\s*max-width: 30vw;/,
    "mobile gives the address column more room and allows its text to wrap",
  );
  assert.match(
    portfolio,
    /\.portfolio-table th:nth-child\(6\),\s*\.portfolio-table td:nth-child\(6\)\s*\{\s*width: 41vw;\s*min-width: 41vw;\s*max-width: 41vw;/,
    "mobile gives the name column more room and allows names to wrap",
  );
  assert.match(
    portfolio,
    /html\[data-theme="dark"\] \.portfolio-table \.property-row-name,\s*html\[data-theme="dark"\] \.portfolio-table \.property-party-name\s*\{\s*color: #f1f7f2;/,
  );
  assert.doesNotMatch(styles, /\.portfolio-(?:panel|table|due)/);
  assert.doesNotMatch(shared, /\.portfolio-|\.property-row-note/);
  assert.doesNotMatch(theme, /\.portfolio-table|\.property-row-note/);
});
