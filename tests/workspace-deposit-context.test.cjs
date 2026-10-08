const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("workspace deposit context composes posted-ledger math with account scoping", () => {
  const calls = [];
  const securityDepositBalance = () => ({ active: [], totals: {} });
  const depositLedger = () => ({ active: [], totals: {}, entries: [] });
  const context = vm.createContext({ window: {} });
  const workflows = {
    depositLedger: {
      create(options) {
        calls.push(["calculations", options]);
        return { securityDepositBalance };
      },
    },
    depositContext: {
      create(options) {
        calls.push(["workspace-data", options]);
        return { depositLedger };
      },
    },
  };
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "workspace-deposit-context.js"),
      "utf8",
    ),
    context,
  );

  const state = { payments: [], expenses: [], depositEntries: [] };
  const isPosted = () => true;
  const postedLedgerUtils = { isPosted, unused: true };
  const workspaceDeposits =
    context.window.PropertyDeskWorkspaceDepositContext.create({
      state,
      postedLedgerUtils,
      workflows,
    });

  assert.deepEqual(
    calls.map(([name]) => name),
    ["calculations", "workspace-data"],
  );
  assert.equal(calls[0][1].isPosted, isPosted);
  assert.deepEqual(Object.keys(calls[0][1]), ["isPosted"]);
  assert.equal(calls[1][1].state, state);
  assert.equal(calls[1][1].securityDepositBalance, securityDepositBalance);
  assert.deepEqual(Object.keys(calls[1][1]).sort(), [
    "securityDepositBalance",
    "state",
  ]);
  assert.equal(workspaceDeposits.depositLedger, depositLedger);
});
