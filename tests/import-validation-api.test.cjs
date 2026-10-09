const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  importWorkflows,
  importValidationApi,
} = require("./import-validation-helpers.cjs");

test("CSV validation modules expose focused validators through the stable import API", () => {
  assert.deepEqual(Object.keys(importWorkflows).sort(), [
    "validateAccountRows",
    "validateExpenseRows",
    "validatePaymentRows",
  ]);
  assert.equal(typeof importValidationApi.create, "function");
  for (const file of [
    "account-import-validation.js",
    "expense-import-validation.js",
    "payment-import-validation.js",
  ]) {
    const source = fs.readFileSync(
      path.join(__dirname, "..", "features", file),
      "utf8",
    );
    assert.doesNotMatch(
      source,
      /globalThis\.PropertyDesk(?!\w+ImportValidation)/,
    );
  }
});
