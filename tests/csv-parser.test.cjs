const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const { parseCSV } = require("../features/csv-parser.js");
require("../features/currency-utils.js");

test("all provided CSV templates parse with their example row", () => {
  for (const filename of [
    "accounts-template.csv",
    "payments-template.csv",
    "expenses-template.csv",
  ]) {
    const csv = fs.readFileSync(
      path.join(__dirname, "..", "templates", filename),
      "utf8",
    );
    assert.equal(parseCSV(csv).length, 1, filename);
  }
});

test("CSV parser handles BOM, CRLF, quoted commas, doubled quotes, and newlines", () => {
  const rows = parseCSV(
    '\uFEFFname,amount,memo\r\n"Oak, LLC",12.50,"paid ""in full"""\r\n"Unit 2",5,"line one\nline two"',
  );
  assert.deepEqual(rows, [
    { name: "Oak, LLC", amount: "12.50", memo: 'paid "in full"' },
    { name: "Unit 2", amount: "5", memo: "line one\nline two" },
  ]);
});

test("CSV parser rejects malformed headings and quoting and marks long rows", () => {
  assert.throws(() => parseCSV("a,a\n1,2"), /duplicate column/i);
  assert.throws(() => parseCSV("a,,c\n1,2,3"), /empty column/i);
  assert.throws(() => parseCSV('a,b\n1,"unfinished'), /unclosed quoted/i);
  assert.match(parseCSV("a,b\n1,2,3")[0]._parse_error, /more values/i);
  assert.throws(() => parseCSV('a,b\n1,"closed"x'), /unexpected characters/i);
  assert.throws(() => parseCSV('a,b\n1,un"closed'), /quote inside/i);
});

test("CSV parsing stays separate from field value validation", () => {
  assert.equal(typeof parseCSV, "function");
  const valueUtils = require("../features/csv-value-utils.js");
  assert.equal(typeof valueUtils.csvMoney, "function");
  assert.equal("parseCSV" in valueUtils, false);
});
