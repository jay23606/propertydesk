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

  const depositEntries = [];
  const payments = [];
  const expenses = [];
  const getDepositEntries = () => depositEntries;
  const getPayments = () => payments;
  const getExpenses = () => expenses;
  const isPosted = () => true;
  const postedLedgerUtils = { isPosted, unused: true };
  const workspaceDeposits =
    context.window.PropertyDeskWorkspaceDepositContext.create({
      getDepositEntries,
      getPayments,
      getExpenses,
      postedLedgerUtils,
      workflows,
    });

  assert.deepEqual(
    calls.map(([name]) => name),
    ["calculations", "workspace-data"],
  );
  assert.equal(calls[0][1].isPosted, isPosted);
  assert.deepEqual(Object.keys(calls[0][1]), ["isPosted"]);
  assert.equal(calls[1][1].getDepositEntries, getDepositEntries);
  assert.equal(calls[1][1].getPayments, getPayments);
  assert.equal(calls[1][1].getExpenses, getExpenses);
  assert.equal(calls[1][1].securityDepositBalance, securityDepositBalance);
  assert.deepEqual(Object.keys(calls[1][1]).sort(), [
    "getDepositEntries",
    "getExpenses",
    "getPayments",
    "securityDepositBalance",
  ]);
  assert.equal(workspaceDeposits.depositLedger, depositLedger);
});
