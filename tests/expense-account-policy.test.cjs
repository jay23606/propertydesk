const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("expense account policy requires a rental only for deposit refunds", () => {
  const context = vm.createContext({ window: {} });
  for (const filename of [
    "transaction-options.js",
    "expense-account-policy.js",
  ])
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
      context,
    );

  const policy = context.window.PropertyDeskExpenseAccountPolicy;
  assert.equal(policy.requiresRentalAccount("deposit_refund"), true);
  assert.equal(policy.requiresRentalAccount("contractor_labor"), false);
  assert.equal(
    policy.accountMatchesCategory("deposit_refund", {
      account_type: "rental",
    }),
    true,
  );
  assert.equal(
    policy.accountMatchesCategory("deposit_refund", {
      account_type: "land_contract",
    }),
    false,
  );
  assert.equal(policy.accountMatchesCategory("deposit_refund", null), false);
  assert.equal(policy.accountMatchesCategory("contractor_labor", null), true);
});
