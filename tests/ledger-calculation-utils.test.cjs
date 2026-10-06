const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
require("../workspace-table-catalog.js");
const { createBackup } = require("../backup-utils.js");
const dateUtils = require("../features/date-utils.js");
const scheduleFactory = require("../ledger-schedule-utils.js");
const loanAmortizationFactory = require("../loan-amortization-utils.js");
const ledgerUtils = require("../ledger-utils.js");
const scheduleUtils = scheduleFactory.create({
  isPosted: ledgerUtils.isPosted,
});
const loanUtils = loanAmortizationFactory.create({
  sumPosted: ledgerUtils.sumPosted,
});
const {
  amountDueSince,
  amortizationSchedule,
  hasPostedPaymentInMonth,
  isPosted,
  monthlyScheduledEstimate,
  paymentStatusInMonth,
  postedOnOrAfter,
  postedPaymentTotalInMonth,
  principalBalance,
  scheduledLoanBalance,
  securityDepositBalance,
  sumIncome,
  sumOperatingExpenses,
  sumPosted,
  unpaidDueAccrualStart,
} = ledgerUtils;

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
    hasPostedPaymentInMonth(receipts, "a1", "2026-10-01"),
    true,
    "a partial payment counts",
  );
  assert.equal(
    hasPostedPaymentInMonth(
      receipts.filter((row) => row.id !== "rent" && row.id !== "partial"),
      "a1",
      "2026-10-01",
    ),
    false,
    "voids, deposits, late fees, other months and other accounts do not count",
  );
  assert.equal(
    hasPostedPaymentInMonth(receipts, "a2", "2026-10-01"),
    true,
    "a rent receipt counts for its own account",
  );
  assert.equal(
    hasPostedPaymentInMonth(receipts, "a1", "bad-date"),
    false,
    "invalid month input does not highlight",
  );
  assert.equal(
    postedPaymentTotalInMonth(receipts, "a1", "2026-10-01"),
    125,
    "only posted rent and installment receipts add to the total",
  );
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

test("voided principal allocations do not reduce the account balance", () => {
  const payments = [
    { principal_amount: "120.00", status: "posted" },
    { principal_amount: "80.00", status: "voided" },
    { principal_amount: "30.00" },
  ];
  assert.equal(principalBalance("500.00", payments), 350);
  assert.equal(principalBalance(40, [{ principal_amount: 50 }]), 0);
});

test("ledger opening balance can differ from contract principal and ignores earlier payments", () => {
  const payments = [
    { principal_amount: 200, received_date: "2025-12-31" },
    { principal_amount: 125, received_date: "2026-01-01" },
    { principal_amount: 100, received_date: "2026-01-02" },
    { principal_amount: 25, received_date: "2026-02-01", status: "voided" },
  ];
  assert.equal(principalBalance(1000, payments, 500, "2026-01-01"), 400);
  assert.equal(principalBalance(1000, payments, 0, "2026-01-01"), 0);
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
