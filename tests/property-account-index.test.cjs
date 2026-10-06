const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("property account index groups each account once and preserves property order", () => {
  let iterations = 0;
  const accounts = [
    { id: "account-1", property_id: "property-1" },
    { id: "account-2", property_id: "property-2" },
    { id: "account-3", property_id: "property-1" },
  ];
  const trackedAccounts = {
    [Symbol.iterator]: function* () {
      iterations++;
      yield* accounts;
    },
  };
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "property-account-index.js"),
      "utf8",
    ),
    context,
  );

  const grouped =
    context.window.PropertyDeskPropertyAccountIndex.groupByProperty(
      trackedAccounts,
    );

  assert.equal(iterations, 1);
  assert.deepEqual(
    Array.from(grouped.get("property-1"), (account) => account.id),
    ["account-1", "account-3"],
  );
  assert.deepEqual(
    Array.from(grouped.get("property-2"), (account) => account.id),
    ["account-2"],
  );
  assert.equal(grouped.has("property-3"), false);
});
