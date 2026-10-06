const test = require("node:test");
const assert = require("node:assert/strict");
const {
  parseCSV,
  validateAccountRows,
  properties,
  accounts,
  readTemplate,
} = require("./import-validation-helpers.cjs");

test("account import maps template fields and applies safe defaults", () => {
  const rows = parseCSV(readTemplate("accounts-template.csv"));
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

test("account import keeps financing, schedule, and opening-ledger terms together", () => {
  const rows = parseCSV(
    "property_name,property_address,account_type,account_name,start_date,payment_amount,original_principal,principal_interest_amount,escrow_amount,ledger_opening_balance,ledger_opening_date,interest_rate,payment_frequency,term_months,late_fee,grace_days,property_kind\nOak House,10 Oak St,note,Oak Note,2026-01-01,750,100000,600,150,95000,2026-02-01,5.5,monthly,360,25,5,residential",
  );
  const result = validateAccountRows(rows, properties, [], "2026-10-03");

  assert.deepEqual(result.errors, []);
  assert.deepEqual(
    {
      payment: result.valid[0].payment_amount,
      principal: result.valid[0].original_principal,
      principalInterest: result.valid[0].principal_interest_amount,
      escrow: result.valid[0].escrow_amount,
      openingBalance: result.valid[0].ledger_opening_balance,
      openingDate: result.valid[0].ledger_opening_date,
      rate: result.valid[0].interest_rate,
      frequency: result.valid[0].payment_frequency,
      term: result.valid[0].term_months,
      lateFee: result.valid[0].late_fee,
      graceDays: result.valid[0].grace_days,
      propertyKind: result.valid[0].property_kind,
    },
    {
      payment: 750,
      principal: 100000,
      principalInterest: 600,
      escrow: 150,
      openingBalance: 95000,
      openingDate: "2026-02-01",
      rate: 5.5,
      frequency: "monthly",
      term: "360",
      lateFee: 25,
      graceDays: 5,
      propertyKind: "residential",
    },
  );

  rows[0].ledger_opening_date = "";
  const missingOpeningDate = validateAccountRows(
    rows,
    properties,
    [],
    "2026-10-03",
  );
  assert.match(
    missingOpeningDate.errors[0].message,
    /opening date is required/,
  );
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
