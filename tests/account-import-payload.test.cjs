const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("account import payload preserves terms and normalizes optional values", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "account-import-payload.js"),
      "utf8",
    ),
    context,
  );

  const [payload, optionalPayload] =
    context.window.PropertyDeskAccountImportPayload.build([
      {
        property_name: "House",
        property_address: "10 Main St",
        city: "Altoona",
        state: "PA",
        postal_code: "16601",
        property_kind: "residential",
        account_type: "land_contract",
        account_name: "Contract",
        party_name: "Buyer",
        party_email: "buyer@example.com",
        party_phone: "555-0100",
        start_date: "2024-01-01",
        next_due_date: "2026-11-01",
        payment_amount: 700,
        payment_frequency: "monthly",
        original_principal: 50000,
        principal_interest_amount: 600,
        escrow_amount: 100,
        ledger_opening_balance: 0,
        ledger_opening_date: "2026-10-01",
        interest_rate: 5,
        term_months: "240",
        balloon_date: "2044-01-01",
        late_fee: 25,
        grace_days: 10,
        notes: "Imported terms",
      },
      {
        account_name: "Rental",
        party_name: "",
        party_email: "",
        party_phone: "",
        next_due_date: "",
        ledger_opening_date: "",
        term_months: "",
        balloon_date: "",
        notes: "",
      },
    ]);

  assert.equal(payload.account_type, "land_contract");
  assert.equal(payload.principal_interest_amount, 600);
  assert.equal(payload.escrow_amount, 100);
  assert.equal(payload.term_months, 240);
  assert.equal(payload.party_email, "buyer@example.com");
  assert.equal(payload.ledger_opening_balance, 0);
  assert.equal(optionalPayload.party_name, null);
  assert.equal(optionalPayload.party_email, null);
  assert.equal(optionalPayload.party_phone, null);
  assert.equal(optionalPayload.next_due_date, null);
  assert.equal(optionalPayload.ledger_opening_date, null);
  assert.equal(optionalPayload.term_months, null);
  assert.equal(optionalPayload.balloon_date, null);
  assert.equal(optionalPayload.notes, null);
});
