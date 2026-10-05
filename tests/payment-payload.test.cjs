const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadBuilder() {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "payment-payload.js"),
      "utf8",
    ),
    context,
  );
  return context.window.PropertyDeskPaymentPayload.build;
}

test("manual loan receipts stay unapplied with no estimated allocation", () => {
  const payload = loadBuilder()({
    ownerId: "workspace-1",
    account: { id: "note-1", account_type: "note" },
    amount: 750,
    receivedDate: "2026-10-04",
    paymentMethod: "check",
    incomeCategory: "ignored-for-notes",
    memo: "October installment",
  });

  assert.deepEqual(JSON.parse(JSON.stringify(payload)), {
    user_id: "workspace-1",
    account_id: "note-1",
    amount: 750,
    received_date: "2026-10-04",
    payment_method: "check",
    income_category: "installment",
    principal_amount: 0,
    interest_amount: 0,
    fee_amount: 0,
    escrow_amount: 0,
    unapplied_amount: 750,
    memo: "October installment",
    source_type: "manual",
  });
});

test("manual rent receipts retain their selected category and rent allocation", () => {
  const payload = loadBuilder()({
    ownerId: "workspace-1",
    account: { id: "rental-1", account_type: "rental" },
    amount: 825,
    receivedDate: "2026-10-04",
    paymentMethod: "manual",
    incomeCategory: "rent",
    memo: "",
  });

  assert.equal(payload.income_category, "rent");
  assert.equal(payload.principal_amount, 0);
  assert.equal(payload.interest_amount, 0);
  assert.equal(payload.escrow_amount, 0);
  assert.equal(payload.unapplied_amount, 0);
  assert.equal(payload.memo, null);
});
