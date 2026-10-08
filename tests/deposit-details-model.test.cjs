const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("deposit details reuse ledger source lookups for posted and voided rows", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "deposit-details-model.js"),
      "utf8",
    ),
    context,
  );
  const entries = [
    {
      id: "received-posted",
      entry_type: "received",
      movement_date: "2026-09-01",
      amount: 500,
      source_payment_id: "payment-posted",
    },
    {
      id: "received-voided",
      entry_type: "received",
      movement_date: "2026-10-01",
      amount: 500,
      source_payment_id: "payment-voided",
    },
    {
      id: "refund-posted",
      entry_type: "refunded",
      movement_date: "2026-09-10",
      amount: 100,
      source_expense_id: "expense-posted",
    },
    {
      id: "retained",
      entry_type: "retained",
      movement_date: "2026-09-15",
      amount: 25,
      reason: "Cleaning",
    },
  ];
  const paymentById = new Map([
    ["payment-posted", { id: "payment-posted", memo: "September receipt" }],
    ["payment-voided", { id: "payment-voided", memo: "Voided receipt" }],
  ]);
  const expenseById = new Map([
    ["expense-posted", { id: "expense-posted", memo: "Refund check" }],
  ]);
  const buildDepositDetails =
    context.window.PropertyDeskDepositDetailsModel.create({
      depositLedger(accountId) {
        assert.equal(accountId, "rental-1");
        return {
          entries,
          active: [entries[0], entries[2], entries[3]],
          totals: { held: 375 },
          paymentById,
          expenseById,
        };
      },
    }).buildDepositDetails;

  const details = buildDepositDetails({
    id: "rental-1",
    account_type: "rental",
  });

  assert.deepEqual(
    details.rows.map(({ reason, active }) => [reason, active]),
    [
      ["September receipt", true],
      ["Voided receipt", false],
      ["Refund check", true],
      ["Cleaning", true],
    ],
  );
  assert.equal(details.totals.held, 375);
  assert.equal(details.canReverseRetention, false);
});
