const test = require("node:test");
const assert = require("node:assert/strict");
const {
  parseCSV,
  selectImportRows,
  validatePaymentRows,
  validateExpenseRows,
  properties,
  accounts,
  readTemplate,
} = require("./import-validation-helpers.cjs");

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
  const rows = parseCSV(readTemplate("payments-template.csv"));
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
