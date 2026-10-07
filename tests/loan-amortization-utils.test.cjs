const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
require("../features/date-utils.js");
const scheduleFactory = require("../ledger-schedule-utils.js");
const loanAmortizationFactory = require("../loan-amortization-utils.js");
require("../features/deposit-ledger-utils.js");
const ledgerUtils = require("../ledger-utils.js");
const scheduleUtils = scheduleFactory.create({
  isPosted: ledgerUtils.isPosted,
});
const loanUtils = loanAmortizationFactory.create({
  sumPosted: ledgerUtils.sumPosted,
});
const { amountDueSince, amortizationSchedule, scheduledLoanBalance } =
  ledgerUtils;

test("due schedule and loan amortization utilities load before the stable ledger API and are precached", () => {
  const html = fs.readFileSync(
    path.join(__dirname, "..", "index.html"),
    "utf8",
  );
  const worker = fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8");
  assert.ok(
    html.indexOf("features/date-utils.js") <
      html.indexOf("ledger-schedule-utils.js"),
  );
  assert.ok(
    html.indexOf("ledger-schedule-utils.js") < html.indexOf("ledger-utils.js"),
  );
  assert.ok(
    html.indexOf("loan-amortization-utils.js") <
      html.indexOf("ledger-utils.js"),
  );
  assert.ok(
    html.indexOf("features/deposit-ledger-utils.js") <
      html.indexOf("ledger-utils.js"),
  );
  assert.match(worker, /'\.\/ledger-schedule-utils\.js'/);
  assert.match(worker, /'\.\/loan-amortization-utils\.js'/);
  assert.match(worker, /'\.\/features\/deposit-ledger-utils\.js'/);
  assert.equal(typeof scheduleUtils.amountDueSince, "function");
  assert.equal(typeof loanUtils.amortizationSchedule, "function");
  assert.equal(typeof ledgerUtils.amortizationSchedule, "function");
  assert.deepEqual(
    Object.keys(ledgerUtils).sort(),
    [
      "amountDueSince",
      "amortizationSchedule",
      "hasPostedPaymentInMonth",
      "isPosted",
      "monthlyScheduledEstimate",
      "paymentStatusInMonth",
      "postedOnOrAfter",
      "postedPaymentTotalInMonth",
      "principalBalance",
      "scheduledLoanBalance",
      "securityDepositBalance",
      "sumIncome",
      "sumOperatingExpenses",
      "sumPosted",
      "unpaidDueAccrualStart",
    ].sort(),
  );
});

test("scheduled loan balance follows amortization and accepts positive or negative owner adjustments", () => {
  const account = {
    account_type: "land_contract",
    original_principal: 1000,
    interest_rate: 0,
    term_months: 4,
    start_date: "2025-12-01",
  };
  assert.equal(scheduledLoanBalance(account, "2026-02-01"), 250);
  assert.equal(
    scheduledLoanBalance({ ...account, balance_adjustment: 125 }, "2026-02-01"),
    375,
  );
  assert.equal(
    scheduledLoanBalance(
      { ...account, balance_adjustment: -125 },
      "2026-02-01",
    ),
    125,
  );
});

test("on-time land-contract schedule provides the hypothetical balance independently of payments received", () => {
  const account = {
    id: "amended-note",
    account_type: "land_contract",
    start_date: "2025-05-01",
    original_principal: 49000,
    interest_rate: 9.0864,
    term_months: 348,
    principal_interest_amount: 400,
    payment_amount: 550,
    payment_frequency: "monthly",
  };
  const schedule = amortizationSchedule(
    account.original_principal,
    account.interest_rate,
    account.term_months,
    account.start_date,
    account.principal_interest_amount,
  );
  assert.equal(schedule[0].date, "2025-05-01");
  assert.equal(schedule[0].payment, 400);
  const hypothetical = scheduledLoanBalance(account, "2026-10-03");
  assert.equal(hypothetical, 48443.54);
  assert.equal(
    scheduledLoanBalance(
      { ...account, balance_adjustment: -250 },
      "2026-10-03",
    ),
    48193.54,
  );
  const received = [
    {
      account_id: account.id,
      amount: 1000,
      received_date: "2026-04-01",
      income_category: "installment",
    },
  ];
  assert.equal(amountDueSince([account], [], "2026-01-01", "2026-10-03"), 5500);
  assert.equal(
    amountDueSince([account], received, "2026-01-01", "2026-10-03"),
    4500,
  );
  assert.equal(
    scheduledLoanBalance(account, "2026-10-03"),
    hypothetical,
    "recording money received changes Unpaid Due, not the on-time balance estimate",
  );
});

test("amortization estimates derive P&I from terms when no contractual P&I amount is supplied", () => {
  const schedule = amortizationSchedule(1000, 12, 12, "2024-01-01");
  assert.equal(schedule.length, 12);
  assert.ok(schedule[0].payment > 0);
  assert.ok(schedule[0].interest > 0);
  assert.equal(schedule.at(-1).balance, 0);
});

test("contractual P&I can be estimated separately from escrow-inclusive installments", () => {
  const schedule = amortizationSchedule(1000, 0, 2, "2024-01-01", 600);
  assert.equal(schedule[0].payment, 600);
  assert.equal(schedule[0].balance, 400);
  assert.equal(schedule[1].payment, 400);
  assert.equal(schedule[1].balance, 0);
});

test("amortization due dates preserve month-end dates without overflowing", () => {
  const schedule = amortizationSchedule(1000, 0, 2, "2024-01-31");
  assert.deepEqual(
    schedule.map((row) => row.date),
    ["2024-01-31", "2024-02-29"],
  );
});

test("amortization begins on the saved first-payment date", () => {
  const account = {
    account_type: "land_contract",
    original_principal: 65000,
    interest_rate: 10.6113,
    term_months: 360,
    start_date: "2026-10-01",
    principal_interest_amount: 600,
  };
  const schedule = amortizationSchedule(
    account.original_principal,
    account.interest_rate,
    account.term_months,
    account.start_date,
    account.principal_interest_amount,
  );

  assert.equal(schedule[0].date, "2026-10-01");
  assert.equal(schedule[0].interest, 574.78);
  assert.equal(schedule[0].principal, 25.22);
  assert.equal(schedule[0].balance, 64974.78);
  assert.equal(scheduledLoanBalance(account, "2026-09-30"), 65000);
  assert.equal(scheduledLoanBalance(account, "2026-10-01"), 64974.78);
});
