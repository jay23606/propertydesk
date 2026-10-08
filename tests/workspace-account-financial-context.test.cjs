const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("workspace account financial context shares state with ledger summaries", () => {
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
  const accountBalance = () => 42;
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
      path.join(
        __dirname,
        "..",
        "features",
        "workspace-account-financial-context.js",
      ),
      "utf8",
    ),
    context,
  );

  const workflow =
    context.window.PropertyDeskWorkspaceAccountFinancialContext.create({
      state,
      ledger: ledgerOptions,
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
  assert.equal(workflow.accountBalance, accountBalance);
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
    "scheduledMonthlyRunRate",
    "summarizeAccount",
  ]);
});
