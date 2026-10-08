const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("account close entry confirms before delegating to persistence", async () => {
  const calls = [];
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "account-close-entry.js"),
      "utf8",
    ),
    context,
  );
  const account = { id: "account-1", name: "Rental" };
  const entry = context.window.PropertyDeskAccountCloseEntry.create({
    confirmAction: (message) => {
      calls.push(["confirm", message]);
      return true;
    },
    saveCloseAccount: (value) => calls.push(["save", value]),
  });

  assert.equal(Object.isFrozen(entry), true);
  await entry.closeAccount(account);

  assert.deepEqual(calls, [
    [
      "confirm",
      "Close “Rental”? Its payment history will remain in your records.",
    ],
    ["save", account],
  ]);
});

test("account close entry does not persist when confirmation is declined", () => {
  const calls = [];
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "account-close-entry.js"),
      "utf8",
    ),
    context,
  );
  const entry = context.window.PropertyDeskAccountCloseEntry.create({
    confirmAction: () => false,
    saveCloseAccount: () => calls.push("save"),
  });

  assert.equal(entry.closeAccount({ id: "account-1", name: "Rental" }), false);
  assert.deepEqual(calls, []);
});
