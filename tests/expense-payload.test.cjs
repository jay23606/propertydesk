const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadBuilder() {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "transaction-payloads.js"),
      "utf8",
    ),
    context,
  );
  return context.window.PropertyDeskTransactionPayloads.buildExpense;
}

test("expense payload normalizes property-only records and optional fields", () => {
  const payload = loadBuilder()({
    ownerId: "workspace-1",
    propertyId: "property-1",
    accountId: "",
    amount: 425.5,
    expenseDate: "2026-10-04",
    category: "contractor_labor",
    payee: "Roofing Co",
    paymentMethod: "check",
    memo: "Roof repair",
  });

  assert.deepEqual(JSON.parse(JSON.stringify(payload)), {
    user_id: "workspace-1",
    property_id: "property-1",
    account_id: null,
    amount: 425.5,
    expense_date: "2026-10-04",
    category: "contractor_labor",
    payee: "Roofing Co",
    payment_method: "check",
    memo: "Roof repair",
    source_type: "manual",
  });
});

test("expense payload preserves linked rental deposit-refund records", () => {
  const payload = loadBuilder()({
    ownerId: "workspace-1",
    propertyId: "property-1",
    accountId: "rental-1",
    amount: 200,
    expenseDate: "2026-10-04",
    category: "deposit_refund",
    paymentMethod: "manual",
  });

  assert.equal(payload.account_id, "rental-1");
  assert.equal(payload.category, "deposit_refund");
  assert.equal(payload.memo, null);
});
