const test = require("node:test");
const assert = require("node:assert/strict");
const {
  parseCSV,
  selectImportRows,
  validateExpenseRows,
  properties,
  accounts,
  readTemplate,
} = require("./import-validation-helpers.cjs");

test("expense import matches property/account, combines source notes, and skips possible duplicates", () => {
  const rows = parseCSV(readTemplate("expenses-template.csv"));
  const templateProperties = [
    { id: "tp1", name: "Maple Street Home", address: "123 Maple Street" },
  ];
  const templateAccounts = [
    {
      id: "tr1",
      property_id: "tp1",
      name: "Maple Street Rental",
      account_type: "rental",
    },
  ];
  const existing = [
    {
      property_id: "tp1",
      account_id: "tr1",
      expense_date: "2026-10-03",
      amount: "125.00",
      payee: "ABC Plumbing",
      memo: "Kitchen faucet repair · Receipt 1024",
    },
  ];
  const result = validateExpenseRows(
    rows,
    templateProperties,
    templateAccounts,
    existing,
  );

  assert.equal(result.errors.length, 0);
  assert.equal(result.valid[0]._possible_duplicate, true);
  assert.deepEqual(selectImportRows(result.valid), []);
  assert.deepEqual(
    [
      result.valid[0].property_name,
      result.valid[0].account_name,
      result.valid[0].category,
    ],
    ["Maple Street Home", "Maple Street Rental", "repairs"],
  );
  assert.equal(result.valid[0].memo, "Kitchen faucet repair · Receipt 1024");
});

test("expense import matches property and account names without case sensitivity", () => {
  const rows = parseCSV(
    "property_name,property_address,account_name,expense_date,amount,category\nMAPLE STREET HOME,123 MAPLE STREET,maple street rental,2026-10-03,25,repairs",
  );
  const result = validateExpenseRows(
    rows,
    [{ id: "p1", name: "Maple Street Home", address: "123 Maple Street" }],
    [
      {
        id: "a1",
        property_id: "p1",
        name: "Maple Street Rental",
        account_type: "rental",
      },
    ],
    [],
  );

  assert.deepEqual(result.errors, []);
  assert.equal(result.valid[0].property_name, "Maple Street Home");
  assert.equal(result.valid[0].account_name, "Maple Street Rental");
});

test("expense import reports property, date, category, and positive-amount errors", () => {
  const rows = parseCSV(
    "property_name,property_address,expense_date,amount,category\nMissing,1 Unknown,2026-02-28,12,repairs\nOak House,10 Oak St,2026-02-30,0,bogus",
  );
  const result = validateExpenseRows(rows, properties, accounts, []);

  assert.deepEqual(result.valid, []);
  assert.deepEqual(
    result.errors.map((error) => error.row),
    [2, 3],
  );
  assert.match(result.errors[0].message, /Property not found/);
  assert.match(
    result.errors[1].message,
    /zero or greater|greater than zero|Invalid expense date|Invalid expense category/,
  );
});

test("security deposit refund imports require and match a rental account", () => {
  const rows = parseCSV(
    "property_name,property_address,account_name,expense_date,amount,category,memo\nMaple Street Home,123 Maple Street,Maple Street Rental,2026-10-02,250,deposit_refund,Deposit returned",
  );
  const property = [
    { id: "tp1", name: "Maple Street Home", address: "123 Maple Street" },
  ];
  const rental = [
    {
      id: "tr1",
      property_id: "tp1",
      name: "Maple Street Rental",
      account_type: "rental",
    },
  ];
  const note = [
    {
      id: "tn1",
      property_id: "tp1",
      name: "Maple Street Rental",
      account_type: "note",
    },
  ];
  assert.equal(
    validateExpenseRows(rows, property, rental, []).valid[0].category,
    "deposit_refund",
  );
  assert.match(
    validateExpenseRows(rows, property, note, []).errors[0].message,
    /rental account/,
  );
  const withoutAccount = parseCSV(
    "property_name,property_address,expense_date,amount,category\nMaple Street Home,123 Maple Street,2026-10-02,250,deposit_refund",
  );
  assert.match(
    validateExpenseRows(withoutAccount, property, rental, []).errors[0].message,
    /rental account/,
  );
});
