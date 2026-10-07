const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("workspace financial context shares state with ledger and deposit models", () => {
  const calls = [];
  const state = { accounts: [] };
  const ledgerOptions = { todayIso() {}, scheduledLoanBalance() {} };
  const depositOptions = { securityDepositBalance() {} };
  const accountBalance = () => 42;
  const depositLedger = () => ({ active: [] });
  const summarizeAccount = () => ({ unpaidDue: 5 });
  const accountSummaryOptions = {
    amountDueSince() {},
    unpaidDueAccrualStart() {},
    todayIso() {},
  };
  let capturedAccountSummaryOptions;
  const context = vm.createContext({
    window: {
      PropertyDeskLedgerContext: {
        create(options) {
          calls.push(["ledger", options]);
          return { accountBalance };
        },
      },
      PropertyDeskDepositContext: {
        create(options) {
          calls.push(["deposit", options]);
          return { depositLedger };
        },
      },
      PropertyDeskAccountFinancialSummary: {
        create(options) {
          capturedAccountSummaryOptions = options;
          return { summarizeAccount };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "workspace-financial-context.js"),
      "utf8",
    ),
    context,
  );

  const workflow = context.window.PropertyDeskWorkspaceFinancialContext.create({
    state,
    ledger: ledgerOptions,
    deposit: depositOptions,
    ...accountSummaryOptions,
  });

  assert.equal(calls[0][0], "ledger");
  assert.equal(calls[0][1].state, state);
  assert.equal(calls[0][1].todayIso, ledgerOptions.todayIso);
  assert.equal(
    calls[0][1].scheduledLoanBalance,
    ledgerOptions.scheduledLoanBalance,
  );
  assert.equal(calls[1][0], "deposit");
  assert.equal(calls[1][1].state, state);
  assert.equal(
    calls[1][1].securityDepositBalance,
    depositOptions.securityDepositBalance,
  );
  assert.equal(workflow.accountBalance, accountBalance);
  assert.equal(workflow.depositLedger, depositLedger);
  assert.equal(capturedAccountSummaryOptions.accountBalance, accountBalance);
  assert.equal(
    capturedAccountSummaryOptions.amountDueSince,
    accountSummaryOptions.amountDueSince,
  );
  assert.equal(
    capturedAccountSummaryOptions.unpaidDueAccrualStart,
    accountSummaryOptions.unpaidDueAccrualStart,
  );
  assert.equal(
    capturedAccountSummaryOptions.todayIso,
    accountSummaryOptions.todayIso,
  );
  assert.equal(workflow.summarizeAccount, summarizeAccount);
  assert.deepEqual(Object.keys(workflow).sort(), [
    "accountBalance",
    "collectedSince",
    "depositLedger",
    "scheduledMonthlyRunRate",
    "summarizeAccount",
  ]);
});
