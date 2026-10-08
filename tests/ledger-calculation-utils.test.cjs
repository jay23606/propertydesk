const test = require("node:test");
const assert = require("node:assert/strict");
require("../features/date-utils.js");
require("../features/currency-utils.js");
const accountStatus = require("../features/account-status-utils.js");
const ledgerUtils = require("../features/posted-ledger-utils.js");
const scheduleUtils = require("../features/ledger-schedule-utils.js").create({
  isDueReducingPayment: ledgerUtils.isDueReducingPayment,
  isActiveAccount: accountStatus.isActiveAccount,
});
const deposits = require("../features/deposit-ledger-utils.js").create({
  isPosted: ledgerUtils.isPosted,
});
const {
  isDueReducingPayment,
  isPosted,
  paymentStatusInMonth,
  postedOnOrAfter,
  sumIncome,
  sumOperatingExpenses,
  sumPosted,
} = ledgerUtils;
const { monthlyScheduledEstimate } = scheduleUtils;
const { securityDepositBalance } = deposits;

test("only posted non-deposit and non-late-fee payments reduce scheduled dues", () => {
  assert.equal(isDueReducingPayment({ income_category: "installment" }), true);
  assert.equal(isDueReducingPayment({ income_category: "rent" }), true);
  assert.equal(isDueReducingPayment({ income_category: "other" }), true);
  assert.equal(isDueReducingPayment({ income_category: "deposit" }), false);
  assert.equal(isDueReducingPayment({ income_category: "late_fee" }), false);
  assert.equal(
    isDueReducingPayment({ income_category: "installment", status: "voided" }),
    false,
  );
});

test("postedOnOrAfter shares date filtering and excludes voided rows", () => {
  const rows = [
    { id: "prior", received_date: "2026-09-30", status: "posted" },
    { id: "current", received_date: "2026-10-01", status: "posted" },
    { id: "later", received_date: "2026-10-06" },
    { id: "voided", received_date: "2026-10-07", status: "voided" },
  ];

  assert.deepEqual(
    postedOnOrAfter(rows, "received_date", "2026-10-01").map(({ id }) => id),
    ["current", "later"],
  );
});

test("payment-month highlighting recognizes any posted installment or rent receipt in the selected month", () => {
  const receipts = [
    {
      id: "partial",
      account_id: "a1",
      amount: 25,
      received_date: "2026-10-02",
      income_category: "installment",
    },
    {
      id: "voided",
      account_id: "a1",
      amount: 550,
      received_date: "2026-10-03",
      income_category: "installment",
      status: "voided",
    },
    {
      id: "deposit",
      account_id: "a1",
      amount: 500,
      received_date: "2026-10-04",
      income_category: "deposit",
    },
    {
      id: "late-fee",
      account_id: "a1",
      amount: 25,
      received_date: "2026-10-05",
      income_category: "late_fee",
    },
    {
      id: "other-month",
      account_id: "a1",
      amount: 550,
      received_date: "2026-09-30",
      income_category: "installment",
    },
    {
      id: "other-account",
      account_id: "a2",
      amount: 825,
      received_date: "2026-10-01",
      income_category: "rent",
    },
    {
      id: "rent",
      account_id: "a1",
      amount: 100,
      received_date: "2026-10-06",
      income_category: "rent",
    },
  ];
  assert.equal(
    paymentStatusInMonth(receipts, "a1", "2026-10-01", 125),
    "full",
    "multiple receipts can reach the full scheduled amount",
  );
  assert.equal(
    paymentStatusInMonth(
      receipts.filter((row) => row.id !== "rent"),
      "a1",
      "2026-10-01",
      125,
    ),
    "partial",
  );
  assert.equal(
    paymentStatusInMonth(
      receipts.filter((row) => row.id !== "rent" && row.id !== "partial"),
      "a1",
      "2026-10-01",
      125,
    ),
    "none",
  );
  assert.equal(
    paymentStatusInMonth(receipts, "a2", "2026-10-01", 1000),
    "partial",
    "rent receipts count for their own account",
  );
  assert.equal(
    paymentStatusInMonth(receipts, "a1", "bad-date", 125),
    "none",
    "invalid month input does not highlight",
  );
});

test("voided payments remain recorded but no longer affect collected income", () => {
  const payments = [
    { amount: "1000.00" },
    { amount: "250.00", status: "posted" },
    { amount: "300.00", status: "voided" },
  ];
  assert.equal(sumPosted(payments), 1250);
  assert.equal(
    isPosted(payments[0]),
    true,
    "legacy rows without status remain posted",
  );
  assert.equal(isPosted(payments[2]), false);
});

test("voided expenses no longer count toward posted expenses", () => {
  assert.equal(
    sumPosted([
      { amount: "75.00", status: "posted" },
      { amount: "25.00", status: "voided" },
    ]),
    75,
  );
});

test("security deposits remain cash receipts but are excluded from income totals", () => {
  const receipts = [
    { amount: 1000, income_category: "rent" },
    { amount: 500, income_category: "deposit" },
    { amount: 25, income_category: "late_fee" },
    { amount: 200, income_category: "deposit", status: "voided" },
  ];
  assert.equal(sumPosted(receipts), 1525);
  assert.equal(sumIncome(receipts), 1025);
});

test("security deposit refunds are excluded from operating expense totals", () => {
  assert.equal(
    sumOperatingExpenses([
      { amount: 100, category: "repairs" },
      { amount: 200, category: "deposit_refund" },
      { amount: 50, category: "insurance", status: "voided" },
    ]),
    100,
  );
});

test("security deposit held balance reconciles posted receipts, refunds, retention, and reversals", () => {
  const entries = [
    { id: "r1", entry_type: "received", amount: 1000, source_payment_id: "p1" },
    { id: "r2", entry_type: "received", amount: 200, source_payment_id: "p2" },
    { id: "f1", entry_type: "refunded", amount: 250, source_expense_id: "e1" },
    { id: "t1", entry_type: "retained", amount: 100 },
    { id: "t2", entry_type: "restored", amount: 25 },
  ];
  const result = securityDepositBalance(
    entries,
    [
      { id: "p1", status: "posted" },
      { id: "p2", status: "voided" },
    ],
    [{ id: "e1", status: "posted" }],
  );
  assert.deepEqual(result.totals, {
    received: 1000,
    refunded: 250,
    retained: 100,
    restored: 25,
    held: 675,
  });
  assert.deepEqual(
    result.active.map((entry) => entry.id),
    ["r1", "f1", "t1", "t2"],
  );
});

test("monthly scheduled totals normalize payment cadence and exclude inactive accounts", () => {
  assert.equal(
    monthlyScheduledEstimate([
      { payment_amount: 1200, payment_frequency: "monthly" },
      { payment_amount: 300, payment_frequency: "weekly" },
      { payment_amount: 500, payment_frequency: "biweekly" },
      { payment_amount: 900, payment_frequency: "quarterly" },
      { payment_amount: 1200, payment_frequency: "annual" },
      { payment_amount: 1000, payment_frequency: "monthly", status: "paused" },
      { payment_amount: 700, payment_frequency: "monthly", status: "closed" },
    ]),
    3983.33,
  );
});
