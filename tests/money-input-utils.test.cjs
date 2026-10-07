const assert = require("node:assert/strict");
const test = require("node:test");
const { moneyInput } = require("../features/money-input-utils.js");

test("currency input normalization handles signed and parenthesized amounts", () => {
  assert.equal(moneyInput("$1,234.567"), 1234.57);
  assert.equal(moneyInput("( $1,234.567 )"), -1234.57);
  assert.equal(moneyInput("-15.50"), -15.5);
  assert.equal(moneyInput("1.005"), 1.01);
});

test("empty and non-finite currency inputs normalize to zero", () => {
  assert.equal(moneyInput(null), 0);
  assert.equal(moneyInput(undefined), 0);
  assert.equal(moneyInput("  "), 0);
  assert.equal(moneyInput("not a number"), 0);
  assert.equal(moneyInput("Infinity"), 0);
});
