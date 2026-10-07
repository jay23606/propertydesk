const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("property account action resets, repopulates, and scopes the account form", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "property-account-action.js"),
      "utf8",
    ),
    context,
  );
  const calls = [];
  const accountProperty = { value: "" };
  const feature = context.window.PropertyDeskPropertyAccountAction.create({
    $: (id) => {
      assert.equal(id, "account-property");
      return accountProperty;
    },
    resetAccountForm: () => {
      accountProperty.value = "";
      calls.push("reset");
    },
    populateFormOptions: () => calls.push("populate"),
    openModal: (id) => calls.push(`open:${id}`),
  });

  feature.openAccountForProperty("property-1");
  assert.equal(accountProperty.value, "property-1");
  assert.deepEqual(calls, ["reset", "populate", "open:account-modal"]);

  calls.length = 0;
  feature.openAccountForProperty();
  assert.equal(accountProperty.value, "");
  assert.deepEqual(calls, ["reset", "populate", "open:account-modal"]);
});
