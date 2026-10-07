const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("workspace financial context shares state with ledger and deposit models", () => {
  const calls = [];
  const state = { accounts: [] };
  const todayIso = () => "2026-10-07";
  const ledgerOptions = {
    todayIso,
    scheduledLoanBalance() {},
    monthlyScheduledEstimate() {},
    postedOnOrAfter() {},
    sumPosted() {},
    unusedLedgerValue: true,
  };
  const depositOptions = {
    securityDepositBalance() {},
    unusedDepositValue: true,
  };
  const accountBalance = () => 42;
  const depositLedger = () => ({ active: [] });
  const summarizeAccount = () => ({ unpaidDue: 5 });
  const accountSummaryOptions = {
    amountDueSince() {},
    unpaidDueAccrualStart() {},
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
  assert.equal(
    calls[0][1].monthlyScheduledEstimate,
    ledgerOptions.monthlyScheduledEstimate,
  );
  assert.equal(calls[0][1].postedOnOrAfter, ledgerOptions.postedOnOrAfter);
  assert.equal(calls[0][1].sumPosted, ledgerOptions.sumPosted);
  assert.equal("unusedLedgerValue" in calls[0][1], false);
  assert.deepEqual(Object.keys(calls[0][1]).sort(), [
    "monthlyScheduledEstimate",
    "postedOnOrAfter",
    "scheduledLoanBalance",
    "state",
    "sumPosted",
    "todayIso",
  ]);
  assert.equal(calls[1][0], "deposit");
  assert.equal(calls[1][1].state, state);
  assert.equal(
    calls[1][1].securityDepositBalance,
    depositOptions.securityDepositBalance,
  );
  assert.equal("unusedDepositValue" in calls[1][1], false);
  assert.deepEqual(Object.keys(calls[1][1]).sort(), [
    "securityDepositBalance",
    "state",
  ]);
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
  assert.equal(capturedAccountSummaryOptions.todayIso, todayIso);
  assert.equal(workflow.summarizeAccount, summarizeAccount);
  assert.deepEqual(Object.keys(workflow).sort(), [
    "accountBalance",
    "collectedSince",
    "depositLedger",
    "scheduledMonthlyRunRate",
    "summarizeAccount",
  ]);
});
