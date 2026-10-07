const assert = require("node:assert/strict");
const test = require("node:test");
const {
  isValidEmailAddress,
  splitEmailAddresses,
} = require("../features/email-address-utils.js");

test("email address utilities split recipient lists and validate each address", () => {
  const addresses = splitEmailAddresses(
    " one@example.test ; invalid, two@example.test, ",
  );

  assert.deepEqual(addresses, [
    "one@example.test",
    "invalid",
    "two@example.test",
  ]);
  assert.deepEqual(addresses.filter(isValidEmailAddress), [
    "one@example.test",
    "two@example.test",
  ]);
});
