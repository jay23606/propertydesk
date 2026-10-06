const test = require("node:test");
const assert = require("node:assert/strict");
const { importWorkflows } = require("./import-validation-helpers.cjs");

test("CSV validation modules expose focused validators through the stable import API", () => {
  assert.deepEqual(Object.keys(importWorkflows).sort(), [
    "validateAccountRows",
    "validateExpenseRows",
    "validatePaymentRows",
  ]);
});
