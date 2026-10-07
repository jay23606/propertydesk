const assert = require("node:assert/strict");
const test = require("node:test");
const { isActiveAccount } = require("../features/account-status-utils.js");

test("missing account status defaults to active while explicit inactive statuses remain inactive", () => {
  assert.equal(isActiveAccount({}), true);
  assert.equal(isActiveAccount({ status: null }), true);
  assert.equal(isActiveAccount({ status: "active" }), true);
  assert.equal(isActiveAccount({ status: "paused" }), false);
  assert.equal(isActiveAccount({ status: "closed" }), false);
});
