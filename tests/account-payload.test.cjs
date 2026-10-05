const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("account payload preserves note terms and normalizes optional loan values", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "account-payload.js"),
      "utf8",
    ),
    context,
  );
  const build = context.window.PropertyDeskAccountPayload.build;
  const payload = build(
    {
      ownerId: "workspace-1",
      propertyId: "property-1",
      accountType: "note",
      name: "Seller note",
      partyName: "Buyer",
      partyEmails: ["buyer@example.test", "co-buyer@example.test"],
      partyPhone: "555-0100",
      reminderEnabled: false,
      startDate: "2025-01-01",
      nextDueDate: "",
      paymentAmount: "$600.00",
      paymentFrequency: "monthly",
      originalPrincipal: "$80,000.00",
      principalInterestAmount: "450.00",
      escrowAmount: "150.00",
      balanceAdjustment: "-25.00",
      interestRate: "6.5",
      termMonths: "240",
      balloonDate: "2030-01-01",
      agreementEffectiveDate: "2025-02-01",
      agreementChangeReason: "Signed amendment",
      lateFee: "25.00",
      graceDays: "10",
      notes: "Owner note",
    },
    (value) => Number(String(value).replace(/[$,]/g, "")),
  );

  assert.deepEqual(JSON.parse(JSON.stringify(payload)), {
    user_id: "workspace-1",
    property_id: "property-1",
    account_type: "note",
    name: "Seller note",
    party_name: "Buyer",
    party_email: "buyer@example.test, co-buyer@example.test",
    party_phone: "555-0100",
    monthly_reminder_enabled: false,
    start_date: "2025-01-01",
    next_due_date: null,
    payment_amount: 600,
    payment_frequency: "monthly",
    original_principal: 80000,
    principal_interest_amount: 450,
    escrow_amount: 150,
    balance_adjustment: -25,
    interest_rate: 6.5,
    term_months: 240,
    balloon_date: "2030-01-01",
    agreement_effective_date: "2025-02-01",
    agreement_change_reason: "Signed amendment",
    late_fee: 25,
    grace_days: 10,
    notes: "Owner note",
  });
});

test("rental account payload clears loan-only fields", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "account-payload.js"),
      "utf8",
    ),
    context,
  );
  const payload = context.window.PropertyDeskAccountPayload.build(
    {
      ownerId: "workspace-1",
      propertyId: "property-1",
      accountType: "rental",
      name: "Monthly rent",
      partyEmails: [],
      paymentAmount: "825",
      paymentFrequency: "monthly",
      originalPrincipal: "90000",
      principalInterestAmount: "500",
      escrowAmount: "200",
      balanceAdjustment: "500",
      interestRate: "6",
      termMonths: "240",
      balloonDate: "2030-01-01",
      lateFee: "0",
      graceDays: "0",
    },
    Number,
  );

  assert.equal(payload.original_principal, 0);
  assert.equal(payload.principal_interest_amount, null);
  assert.equal(payload.escrow_amount, 0);
  assert.equal(payload.balance_adjustment, 0);
  assert.equal(payload.interest_rate, 0);
  assert.equal(payload.term_months, null);
  assert.equal(payload.balloon_date, null);
  assert.equal(payload.party_email, null);
});
