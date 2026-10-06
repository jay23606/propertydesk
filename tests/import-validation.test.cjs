const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { parseCSV } = require("../csv-parser.js");
require("../features/money-input-utils.js");
require("../features/domain-options.js");
require("../features/transaction-options.js");
const { selectImportRows } = require("../import-utils.js");
require("../account-import-validation.js");
require("../expense-import-validation.js");
require("../payment-import-validation.js");
const {
  validateAccountRows,
  validateExpenseRows,
  validatePaymentRows,
} = require("../import-workflows.js");

test("CSV validation modules expose focused validators through the stable import API", () => {
  assert.deepEqual(Object.keys(require("../import-workflows.js")).sort(), [
    "validateAccountRows",
    "validateExpenseRows",
    "validatePaymentRows",
  ]);
});

const properties = [{ id: "p1", name: "Oak House", address: "10 Oak St" }];
const accounts = [
  { id: "r1", property_id: "p1", name: "Oak Rental", account_type: "rental" },
  {
    id: "n1",
    property_id: "p1",
    name: "Oak Contract",
    account_type: "land_contract",
  },
];

test("account import maps template fields and applies safe defaults", () => {
  const rows = parseCSV(
    fs.readFileSync(
      path.join(__dirname, "..", "templates", "accounts-template.csv"),
      "utf8",
    ),
  );
  const result = validateAccountRows(rows, [], [], "2026-10-03");

  assert.equal(result.errors.length, 0);
  assert.equal(result.total, 1);
  assert.equal(result.valid[0].account_type, "rental");
  assert.equal(result.valid[0].payment_frequency, "monthly");
  assert.equal(result.valid[0].start_date, "2026-01-01");
  assert.equal(result.valid[0].original_principal, 0);
  assert.equal(result.valid[0].late_fee, 50);
  assert.equal(result.valid[0].grace_days, 5);
  assert.equal(result.valid[0].party_phone, "(555) 555-0100");
});

test("account import reports bad values and revalidates edits against existing accounts", () => {
  const rows = parseCSV(
    "property_name,property_address,account_type,account_name,start_date,party_email,party_phone\nOak House,10 Oak St,rental,Oak Rental,2026-01-01,,555-0100\nOak House,10 Oak St,rental,New Lease,not-a-date,invalid-email,",
  );
  const first = validateAccountRows(rows, properties, accounts, "2026-10-03");
  assert.deepEqual(
    first.errors.map((error) => error.row),
    [2, 3],
  );

  rows[0].account_name = "New Rental";
  rows[1].start_date = "2026-01-15";
  rows[1].party_email = "tenant@example.com";
  const corrected = validateAccountRows(
    rows,
    properties,
    accounts,
    "2026-10-03",
  );
  assert.equal(corrected.errors.length, 0);
  assert.deepEqual(
    corrected.valid.map((row) => row._source_row),
    [2, 3],
  );
  assert.equal(corrected.valid[1].party_email, "tenant@example.com");
  assert.equal(corrected.valid[0].party_phone, "555-0100");
});

test("account import duplicate checks normalize case and stay scoped to the property", () => {
  const rows = parseCSV(
    "property_name,property_address,account_type,account_name,start_date\nOAK HOUSE,10 OAK ST,rental,OAK RENTAL,2026-01-01\nPine House,20 Pine St,rental,Oak Rental,2026-01-01",
  );
  const result = validateAccountRows(
    rows,
    [
      { id: "p1", name: "Oak House", address: "10 Oak St" },
      { id: "p2", name: "Pine House", address: "20 Pine St" },
    ],
    [{ id: "a1", property_id: "p1", name: "Oak Rental" }],
    "2026-10-03",
  );

  assert.deepEqual(
    result.errors.map((error) => error.row),
    [2],
  );
  assert.match(result.errors[0].message, /Possible duplicate account/);
  assert.equal(result.valid[0].property_name, "Pine House");
  assert.equal(result.valid[0].account_name, "Oak Rental");
});

test("account import duplicate keys do not collide on separator characters", () => {
  const rows = parseCSV(
    "property_name,property_address,account_type,account_name,start_date\nB,C|D,rental,A,2026-01-01",
  );
  const result = validateAccountRows(
    rows,
    [{ id: "p1", name: "C", address: "D" }],
    [{ id: "a1", property_id: "p1", name: "A|B" }],
    "2026-10-03",
  );

  assert.deepEqual(result.errors, []);
  assert.equal(result.valid[0].account_name, "A");
  assert.equal(result.valid[0].property_name, "B");
  assert.equal(result.valid[0].property_address, "C|D");
});

test("expense import matches property/account, combines source notes, and skips possible duplicates", () => {
  const rows = parseCSV(
    fs.readFileSync(
      path.join(__dirname, "..", "templates", "expenses-template.csv"),
      "utf8",
    ),
  );
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

test("payment import enforces loan allocation totals and excludes duplicate receipts by default", () => {
  const rows = parseCSV(
    "property_name,property_address,account_name,received_date,amount,principal_amount,interest_amount,fee_amount,unapplied_amount,memo\nOak House,10 Oak St,Oak Contract,2026-10-01,200,150,50,0,0,October\nOak House,10 Oak St,Oak Contract,2026-10-01,200,150,50,0,0,October\nOak House,10 Oak St,Oak Contract,2026-10-02,100,90,0,0,0,Wrong total",
  );
  const result = validatePaymentRows(rows, properties, accounts, []);

  assert.equal(result.errors.length, 1);
  assert.equal(result.errors[0].row, 4);
  assert.equal(result.valid[0]._possible_duplicate, false);
  assert.equal(result.valid[1]._possible_duplicate, true);
  assert.deepEqual(
    selectImportRows(result.valid).map((row) => row.amount),
    [200],
  );
  assert.equal(result.valid[0].principal_amount, 150);
  assert.equal(result.valid[0].interest_amount, 50);
});

test("simple loan payment imports do not need principal and interest columns", () => {
  const rows = parseCSV(
    "property_name,property_address,account_name,received_date,amount,payment_method,memo\nOak House,10 Oak St,Oak Contract,2026-10-01,750,check,October installment",
  );
  const result = validatePaymentRows(rows, properties, accounts, []);
  assert.equal(result.errors.length, 0);
  assert.equal(result.valid[0].amount, 750);
  assert.equal(result.valid[0].principal_amount, 0);
  assert.equal(result.valid[0].interest_amount, 0);
  assert.equal(result.valid[0].unapplied_amount, 750);
});

test("payment import matches property and account names without case sensitivity", () => {
  const rows = parseCSV(
    "property_name,property_address,account_name,received_date,amount\noak house,10 oak st,OAK CONTRACT,2026-10-01,100",
  );
  const result = validatePaymentRows(
    rows,
    [{ id: "p1", name: "Oak House", address: "10 Oak St" }],
    [
      {
        id: "a1",
        property_id: "p1",
        name: "Oak Contract",
        account_type: "note",
      },
    ],
    [],
  );

  assert.deepEqual(result.errors, []);
  assert.equal(result.valid[0].property_name, "Oak House");
  assert.equal(result.valid[0].account_name, "Oak Contract");
});

test("payment import counts escrow separately from interest and principal", () => {
  const rows = parseCSV(
    "property_name,property_address,account_name,received_date,amount,principal_amount,interest_amount,fee_amount,escrow_amount,unapplied_amount\nOak House,10 Oak St,Oak Contract,2026-10-01,750,24.39,575.61,0,150,0",
  );
  const result = validatePaymentRows(rows, properties, accounts, []);
  assert.equal(result.valid[0].escrow_amount, 150);
});

test("payment import validates account lookup and normalizes rental allocations to zero", () => {
  const rows = parseCSV(
    "property_name,property_address,account_name,received_date,amount,principal_amount,interest_amount,fee_amount,unapplied_amount\nOak House,10 Oak St,Oak Rental,2026-10-01,50,25,25,0,0\nOak House,10 Oak St,No Such Account,2026-10-01,50,0,0,0,0",
  );
  const result = validatePaymentRows(rows, properties, accounts, []);

  assert.equal(result.valid.length, 1);
  assert.equal(result.valid[0].income_category, "rent");
  assert.equal(result.valid[0].principal_amount, 0);
  assert.equal(result.valid[0].interest_amount, 0);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0].message, /Account not found/);
});

test("payment template example maps to a clean rental receipt", () => {
  const rows = parseCSV(
    fs.readFileSync(
      path.join(__dirname, "..", "templates", "payments-template.csv"),
      "utf8",
    ),
  );
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
  const result = validatePaymentRows(
    rows,
    templateProperties,
    templateAccounts,
    [],
  );

  assert.equal(result.errors.length, 0);
  assert.equal(result.valid.length, 1);
  assert.equal(result.valid[0].amount, 1500);
  assert.equal(result.valid[0].income_category, "rent");
  assert.equal(result.valid[0].memo, "October rent");
});

test("payment import rejects rental and financing categories on the wrong account type", () => {
  const rows = parseCSV(
    "property_name,property_address,account_name,received_date,amount,income_category,principal_amount,interest_amount,fee_amount,unapplied_amount\nOak House,10 Oak St,Oak Rental,2026-10-01,50,installment,0,0,0,0\nOak House,10 Oak St,Oak Contract,2026-10-01,50,rent,50,0,0,0",
  );
  const result = validatePaymentRows(rows, properties, accounts, []);

  assert.deepEqual(result.valid, []);
  assert.deepEqual(
    result.errors.map((error) => error.row),
    [2, 3],
  );
  assert.match(result.errors[0].message, /rental/);
  assert.match(result.errors[1].message, /land_contract/);
});

test("payment and expense imports build property and account lookups once", () => {
  const track = (rows, counter) => ({
    [Symbol.iterator]: function* () {
      counter.count++;
      yield* rows;
    },
  });
  const sourceProperty = {
    id: "p1",
    name: "Oak House",
    address: "10 Oak St",
  };
  const sourceAccount = {
    id: "n1",
    property_id: "p1",
    name: "Oak Contract",
    account_type: "land_contract",
  };
  const rows = parseCSV(
    "property_name,property_address,account_name,received_date,amount,memo\nOak House,10 Oak St,Oak Contract,2026-10-01,100,October 1\nOak House,10 Oak St,Oak Contract,2026-10-02,100,October 2",
  );
  const paymentPropertyIterations = { count: 0 };
  const paymentAccountIterations = { count: 0 };
  const payments = validatePaymentRows(
    rows,
    track([sourceProperty], paymentPropertyIterations),
    track([sourceAccount], paymentAccountIterations),
    [],
  );
  assert.equal(payments.valid.length, 2);
  assert.deepEqual(payments.errors, []);
  assert.equal(paymentPropertyIterations.count, 1);
  assert.equal(paymentAccountIterations.count, 1);

  const expenseRows = parseCSV(
    "property_name,property_address,account_name,expense_date,amount,category\nOak House,10 Oak St,Oak Contract,2026-10-01,25,repairs\nOak House,10 Oak St,Oak Contract,2026-10-02,30,repairs",
  );
  const expensePropertyIterations = { count: 0 };
  const expenseAccountIterations = { count: 0 };
  const expenses = validateExpenseRows(
    expenseRows,
    track([sourceProperty], expensePropertyIterations),
    track([sourceAccount], expenseAccountIterations),
    [],
  );
  assert.equal(expenses.valid.length, 2);
  assert.deepEqual(expenses.errors, []);
  assert.equal(expensePropertyIterations.count, 1);
  assert.equal(expenseAccountIterations.count, 1);
});
