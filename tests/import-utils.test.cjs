const test = require("node:test");
const assert = require("node:assert/strict");
const { parseCSV } = require("../csv-parser.js");
const {
  csvMoney,
  csvRate,
  createImportLookup,
  markPossibleDuplicates,
  selectImportRows,
  validIsoDate,
  validateImportRows,
} = require("../import-utils.js");

test("row validation keeps valid rows and reports every bad source row", () => {
  const rows = parseCSV(
    "name,amount\nGood,10\nBad,nope\nExtra,4,unexpected\n\nAlso good,2",
  );
  const result = validateImportRows(rows, (row) => {
    const amount = csvMoney(row.amount, `amount for ${row.name}`, {
      minimum: 0.01,
    });
    return { name: row.name, amount };
  });

  assert.equal(result.total, 4);
  assert.deepEqual(
    result.valid.map((row) => [row._source_row, row.name, row.amount]),
    [
      [2, "Good", 10],
      [6, "Also good", 2],
    ],
  );
  assert.deepEqual(result.errors, [
    { row: 3, message: "Invalid amount “nope” for amount for Bad." },
    {
      row: 4,
      message: "This row has more values than the CSV column headings.",
    },
  ]);
});

test("a corrected staged row can be revalidated and keeps its original CSV row number", () => {
  const rows = parseCSV("name,amount\nFix me,bad");
  const validate = (sourceRows) =>
    validateImportRows(sourceRows, (row) => {
      if (!row.name.trim()) throw new Error("Name is required.");
      return {
        name: row.name.trim(),
        amount: csvMoney(row.amount, "amount", { minimum: 0.01 }),
      };
    });
  assert.equal(validate(rows).errors[0].row, 2);

  rows[0].amount = "275.50";
  const corrected = validate(rows);
  assert.deepEqual(corrected.errors, []);
  assert.deepEqual(corrected.valid, [
    { name: "Fix me", amount: 275.5, _source_row: 2 },
  ]);

  const missingColumn = parseCSV("name\nSupply missing column");
  missingColumn[0].amount = "18.25";
  assert.deepEqual(validate(missingColumn).valid, [
    { name: "Supply missing column", amount: 18.25, _source_row: 2 },
  ]);
});

test("CSV money accepts valid currency and rejects malformed, negative, or too-precise values", () => {
  assert.equal(csvMoney("$1,200.00", "amount"), 1200);
  assert.equal(csvMoney("(5.25)", "amount", { minimum: -10 }), -5.25);
  assert.equal(csvMoney("", "optional amount", { optional: true }), 0);
  for (const value of ["12xyz", "-12", "$1,20.00", "1.234"]) {
    assert.throws(() => csvMoney(value, "amount"), /Invalid amount/i, value);
  }
  assert.throws(
    () => csvMoney("0", "payment", { minimum: 0.01 }),
    /greater than zero/i,
  );
});

test("CSV rates preserve contractual precision up to five decimal places", () => {
  assert.equal(csvRate("7.2028%", "annual rate"), 7.2028);
  assert.equal(csvRate("", "optional rate", { optional: true }), 0);
  for (const value of ["-1", "100.001", "7.123456", "rate"]) {
    assert.throws(
      () => csvRate(value, "annual rate"),
      /Invalid rate|between 0 and 100/i,
      value,
    );
  }
});

test("date validator accepts real ISO dates and rejects impossible dates", () => {
  assert.equal(validIsoDate("2024-02-29"), true);
  assert.equal(validIsoDate("2025-02-29"), false);
  assert.equal(validIsoDate("10/01/2025"), false);
  assert.equal(validIsoDate("2025-13-01"), false);
});

test("indexed CSV lookup preserves normalized and exact first-match behavior", () => {
  const firstProperty = { id: "p1", name: "Oak House", address: "10 Oak St" };
  const secondProperty = { id: "p2", name: "OAK HOUSE", address: "10 OAK ST" };
  const firstAccount = {
    id: "a1",
    property_id: "p1",
    name: "Oak Rental",
  };
  const secondAccount = {
    id: "a2",
    property_id: "p1",
    name: "OAK RENTAL",
  };
  const lookup = createImportLookup(
    [firstProperty, secondProperty],
    [firstAccount, secondAccount],
  );

  assert.equal(lookup.findProperty("oAk HoUsE", "10 oAk St"), firstProperty);
  assert.equal(
    lookup.findExactProperty("OAK HOUSE", "10 OAK ST"),
    secondProperty,
  );
  assert.equal(lookup.findAccount("p1", "OAK RENTAL"), firstAccount);
  assert.equal(lookup.findExactAccount("p1", "OAK RENTAL"), secondAccount);
});

test("re-imported and repeated rows are flagged and excluded unless explicitly included", () => {
  const key = (row) => `${row.account}|${row.date}|${row.amount}|${row.memo}`;
  const rows = [
    { account: "a1", date: "2025-01-01", amount: "100.00", memo: "January" },
    { account: "a1", date: "2025-02-01", amount: "100.00", memo: "February" },
    { account: "a1", date: "2025-02-01", amount: "100.00", memo: "February" },
  ];
  const flagged = markPossibleDuplicates(rows, [key(rows[0])], key);

  assert.deepEqual(
    flagged.map((row) => row._possible_duplicate),
    [true, false, true],
  );
  assert.deepEqual(
    selectImportRows(flagged).map((row) => row.memo),
    ["February"],
  );
  assert.equal(selectImportRows(flagged, true).length, 3);
});
