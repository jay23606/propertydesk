const test = require("node:test");
const assert = require("node:assert/strict");
const dateUtils = require("../features/date-utils.js");
require("../features/currency-utils.js");
const accountStatus = require("../features/account-status-utils.js");
const postedLedger = require("../features/posted-ledger-utils.js");
const { amountDueSince, unpaidDueAccrualStart } =
  require("../features/ledger-schedule-utils.js").create({
    isDueReducingPayment: postedLedger.isDueReducingPayment,
    isActiveAccount: accountStatus.isActiveAccount,
  });

test("shared month-anchor dates clamp at month end without mutating the anchor", () => {
  const jan31 = new Date("2026-01-31T12:00:00");
  const february = dateUtils.monthDateWithAnchor(jan31, 1, 31);
  const march = dateUtils.monthDateWithAnchor(jan31, 2, 31);
  const leapFebruary = dateUtils.monthDateWithAnchor(
    new Date("2024-01-31T12:00:00"),
    1,
    31,
  );
  const previousFebruary = dateUtils.monthDateWithAnchor(
    new Date("2026-03-31T12:00:00"),
    -1,
    31,
  );

  assert.equal(february.toISOString().slice(0, 10), "2026-02-28");
  assert.equal(march.toISOString().slice(0, 10), "2026-03-31");
  assert.equal(leapFebruary.toISOString().slice(0, 10), "2024-02-29");
  assert.equal(previousFebruary.toISOString().slice(0, 10), "2026-02-28");
  assert.equal(jan31.toISOString().slice(0, 10), "2026-01-31");
});

test("unpaid scheduled charges accumulate from 2026 and carry forward, crediting only posted non-deposit payments", () => {
  const accounts = [
    {
      id: "a1",
      start_date: "2025-12-01",
      next_due_date: "2025-12-01",
      payment_amount: 500,
      payment_frequency: "monthly",
    },
    {
      id: "a2",
      start_date: "2026-01-01",
      next_due_date: "2026-01-01",
      payment_amount: 250,
      payment_frequency: "monthly",
    },
  ];
  const payments = [
    {
      account_id: "a1",
      amount: 500,
      received_date: "2026-01-02",
      income_category: "installment",
    },
    {
      account_id: "a1",
      amount: 500,
      received_date: "2026-02-02",
      income_category: "installment",
      status: "voided",
    },
    {
      account_id: "a1",
      amount: 500,
      received_date: "2026-03-01",
      income_category: "deposit",
    },
    {
      account_id: "a2",
      amount: 250,
      received_date: "2026-01-03",
      income_category: "rent",
    },
  ];
  assert.equal(
    amountDueSince(accounts, payments, "2026-01-01", "2026-03-31"),
    1500,
  );
});

test("running amount due includes the whole current month and a recorded payment reduces it dollar-for-dollar", () => {
  const account = {
    id: "rolling",
    start_date: "2025-12-15",
    next_due_date: "2026-01-15",
    payment_amount: 100,
    payment_frequency: "monthly",
  };
  const payments = [
    {
      account_id: "rolling",
      amount: 60,
      received_date: "2026-01-20",
      income_category: "installment",
    },
  ];
  assert.equal(
    amountDueSince([account], payments, "2026-01-01", "2026-02-14"),
    140,
    "the February installment is assumed unpaid before its due day",
  );
  assert.equal(
    amountDueSince([account], payments, "2026-01-01", "2026-02-15"),
    140,
    "the next month adds another scheduled installment",
  );
  assert.equal(
    amountDueSince(
      [account],
      [
        ...payments,
        {
          account_id: "rolling",
          amount: 100,
          received_date: "2026-02-15",
          income_category: "installment",
        },
      ],
      "2026-01-01",
      "2026-02-28",
    ),
    40,
    "recording the next payment subtracts from the carry-forward amount",
  );
});

test("current month is assumed unpaid and the carry-forward grows each month without a payment", () => {
  const account = {
    id: "october",
    start_date: "2025-12-15",
    next_due_date: "2026-10-15",
    payment_amount: 100,
    payment_frequency: "monthly",
  };
  const janThroughSep = Array.from({ length: 9 }, (_, index) => ({
    account_id: "october",
    amount: 100,
    received_date: `2026-${String(index + 1).padStart(2, "0")}-15`,
    income_category: "installment",
  }));
  assert.equal(
    amountDueSince([account], janThroughSep, "2026-01-01", "2026-10-03"),
    100,
    "October is included before the October 15 due day",
  );
  assert.equal(
    amountDueSince([account], janThroughSep, "2026-01-01", "2026-11-03"),
    200,
    "a missed October amount carries forward with November",
  );
  assert.equal(
    amountDueSince(
      [account],
      [
        ...janThroughSep,
        {
          account_id: "october",
          amount: 100,
          received_date: "2026-10-15",
          income_category: "installment",
        },
      ],
      "2026-01-01",
      "2026-11-03",
    ),
    100,
    "a recorded October payment subtracts from the running total",
  );
});

test("unpaid due starts in October 2026 across account types, ignores unrecorded earlier months, then carries forward", () => {
  const account = {
    id: "contract-october",
    account_type: "land_contract",
    start_date: "2020-04-01",
    next_due_date: "2026-10-15",
    payment_amount: 550,
    payment_frequency: "monthly",
  };
  const priorReceipts = Array.from({ length: 9 }, (_, index) => ({
    account_id: account.id,
    amount: 550,
    received_date: `2026-${String(index + 1).padStart(2, "0")}-15`,
    income_category: "installment",
  }));
  const trackingStart = unpaidDueAccrualStart();
  assert.equal(trackingStart, "2026-10-01");
  assert.equal(
    amountDueSince([account], priorReceipts, trackingStart, "2026-10-03"),
    550,
    "only October is assumed unpaid at launch",
  );
  assert.equal(
    amountDueSince([account], priorReceipts, trackingStart, "2026-11-03"),
    1100,
    "an unpaid October installment carries into November",
  );
  assert.equal(
    amountDueSince(
      [account],
      [
        ...priorReceipts,
        {
          account_id: account.id,
          amount: 550,
          received_date: "2026-10-15",
          income_category: "installment",
        },
      ],
      trackingStart,
      "2026-11-03",
    ),
    550,
    "recording October payment reduces the carry-forward",
  );
  const rental = { ...account, id: "rental-october", account_type: "rental" };
  const rentalReceipts = priorReceipts.map((payment) => ({
    ...payment,
    account_id: rental.id,
    income_category: "rent",
  }));
  assert.equal(unpaidDueAccrualStart(), "2026-10-01");
  assert.equal(
    amountDueSince(
      [rental],
      rentalReceipts,
      unpaidDueAccrualStart(),
      "2026-10-03",
    ),
    550,
    "rentals also start at October because earlier receipts are not fully recorded",
  );
  assert.equal(
    amountDueSince(
      [rental],
      rentalReceipts,
      unpaidDueAccrualStart(),
      "2026-11-03",
    ),
    1100,
    "missed rent then carries forward in later months",
  );
});

test("monthly due dates stay anchored at month end", () => {
  assert.equal(
    amountDueSince(
      [
        {
          id: "month-end",
          start_date: "2026-01-31",
          next_due_date: "2026-01-31",
          payment_amount: 100,
          payment_frequency: "monthly",
        },
      ],
      [],
      "2026-01-01",
      "2026-03-31",
    ),
    300,
  );
});

test("unpaid charges backfill from the current next-due date through the 2026 accrual window", () => {
  const account = {
    id: "advanced-due",
    start_date: "2020-01-15",
    next_due_date: "2026-10-15",
    payment_amount: 100,
    payment_frequency: "monthly",
  };
  assert.equal(amountDueSince([account], [], "2026-01-01", "2026-10-03"), 1000);
  assert.equal(
    amountDueSince(
      [{ ...account, next_due_date: "2026-11-15" }],
      [],
      "2026-01-01",
      "2026-10-03",
    ),
    1000,
  );
  assert.equal(
    amountDueSince(
      [{ ...account, start_date: "2026-05-15" }],
      [],
      "2026-01-01",
      "2026-10-03",
    ),
    600,
  );
});

test("future next-due dates retain the month-end anchor when backfilling prior installments", () => {
  assert.equal(
    amountDueSince(
      [
        {
          id: "advanced-month-end",
          start_date: "2020-01-31",
          next_due_date: "2026-10-31",
          payment_amount: 80,
          payment_frequency: "monthly",
        },
      ],
      [],
      "2026-01-01",
      "2026-03-31",
    ),
    240,
  );
});
