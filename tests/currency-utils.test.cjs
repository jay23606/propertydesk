const assert = require("node:assert/strict");
const test = require("node:test");
const { moneyInput, roundCurrency } = require("../features/currency-utils.js");

test("currency input normalization handles signed and parenthesized amounts", () => {
  assert.equal(moneyInput("$1,234.567"), 1234.57);
  assert.equal(moneyInput("( $1,234.567 )"), -1234.57);
  assert.equal(moneyInput("-15.50"), -15.5);
  assert.equal(moneyInput("1.005"), 1.01);
});

test("shared currency rounding applies the same cent rule to calculations", () => {
  assert.equal(roundCurrency(1.005), 1.01);
  assert.equal(roundCurrency(12.344), 12.34);
  assert.equal(roundCurrency(12.345), 12.35);
});

test("empty and non-finite currency inputs normalize to zero", () => {
  assert.equal(moneyInput(null), 0);
  assert.equal(moneyInput(undefined), 0);
  assert.equal(moneyInput("  "), 0);
  assert.equal(moneyInput("not a number"), 0);
  assert.equal(moneyInput("Infinity"), 0);
});
