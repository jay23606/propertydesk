const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("overview model aggregates current counts, upcoming accounts, activity, and property cards", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "overview-model.js"),
      "utf8",
    ),
    context,
  );
  const properties = [
    { id: "property-1", name: "One Oak" },
    { id: "property-2", name: "Two Pine", archived_at: "2026-01-01" },
  ];
  const accounts = [
    {
      id: "note-1",
      property_id: "property-1",
      account_type: "note",
      status: "active",
      payment_amount: 600,
      payment_frequency: "monthly",
      party_name: "Alice",
      next_due_date: "2026-11-01",
    },
    {
      id: "rental-1",
      property_id: "property-1",
      account_type: "rental",
      status: "active",
      payment_amount: 800,
      payment_frequency: "quarterly",
      party_name: "Bob",
      next_due_date: "2026-10-10",
    },
    {
      id: "closed-1",
      property_id: "property-1",
      account_type: "rental",
      status: "closed",
      payment_amount: 500,
      payment_frequency: "monthly",
      party_name: "Closed tenant",
    },
    {
      id: "archived-1",
      property_id: "property-2",
      account_type: "rental",
      status: "active",
      payment_amount: 400,
      payment_frequency: "monthly",
      next_due_date: "2026-10-05",
    },
  ];
  const payments = [
    {
      id: "payment-1",
      account_id: "rental-1",
      amount: 800,
      received_date: "2026-10-02",
      payment_method: "manual",
      status: "posted",
    },
    {
      id: "payment-2",
      account_id: "note-1",
      amount: 600,
      received_date: "2026-09-02",
      payment_method: "check",
      status: "posted",
    },
    {
      id: "payment-3",
      account_id: "note-1",
      amount: 300,
      received_date: "2026-10-03",
      payment_method: "check",
      status: "voided",
    },
  ];
  const model = context.window.PropertyDeskOverviewModel.create({
    state: { properties, accounts, payments },
    monthlyScheduledEstimate: (rows) =>
      rows.reduce((sum, account) => sum + account.payment_amount, 0),
    accountBalance: (account) => (account.id === "note-1" ? 42000 : 0),
    amountDueSince: (rows) => (rows[0].id === "closed-1" ? 0 : 100),
    unpaidDueAccrualStart: () => "2026-10-01",
    todayIso: () => "2026-10-05",
    collectedSince: (start) => (start === "2026-10-01" ? 800 : 0),
    scheduledMonthlyRunRate: () => 1300,
    monthStart: () => "2026-10-01",
    isPosted: (payment) => payment.status !== "voided",
  });

  const summary = model.buildOverview();

  assert.equal(summary.propertyCount, 1);
  assert.equal(summary.accountCount, 2);
  assert.equal(summary.collected, 800);
  assert.equal(summary.expected, 1300);
  assert.equal(summary.recordedPaymentCount, 1);
  assert.deepEqual(
    summary.upcoming.map(({ account }) => account.id),
    ["archived-1", "rental-1", "note-1"],
  );
  assert.equal(summary.upcoming[0].property, properties[1]);
  assert.equal(summary.recent[0].payment, payments[0]);
  assert.equal(summary.recent[0].account, accounts[1]);
  assert.equal(summary.recent[0].property, properties[0]);
  assert.equal(summary.propertyCards.length, 1);
  assert.equal(summary.propertyCards[0].scheduledMonthly, 1400);
  assert.equal(summary.propertyCards[0].hasNonMonthly, true);
  assert.equal(summary.propertyCards[0].loanBalance, 42000);
  assert.equal(summary.propertyCards[0].hasLoanAccount, true);
  assert.equal(summary.propertyCards[0].amountDue, 200);
  assert.equal(summary.propertyCards[0].parties, "Alice, Bob");
});
