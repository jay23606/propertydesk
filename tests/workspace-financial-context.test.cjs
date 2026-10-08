const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("workspace financial context composes ledger, account, loan, and deposit services", () => {
  const calls = [];
  const state = {
    accounts: [],
    payments: [],
    depositEntries: [],
    expenses: [],
  };
  const isDueReducingPayment = () => true;
  const isActiveAccount = () => true;
  const isPosted = () => true;
  const sumPosted = () => 1;
  const postedOnOrAfter = () => [];
  const amountDueSince = () => 2;
  const monthlyScheduledEstimate = () => 3;
  const unpaidDueAccrualStart = () => "2026-10-01";
  const amortizationSchedule = () => [];
  const scheduledLoanBalance = () => 4;
  const securityDepositBalance = () => ({ active: [], totals: {} });
  const accountBalance = () => 5;
  const scheduledMonthlyRunRate = () => 6;
  const collectedSince = () => 7;
  const summarizeAccount = () => ({});
  const depositLedger = () => ({ active: [], totals: {} });
  const postedLedgerUtils = {
    isDueReducingPayment,
    isPosted,
    paymentStatusInMonth() {},
    postedOnOrAfter,
    sumIncome() {},
    sumOperatingExpenses() {},
    sumPosted,
  };
  const context = vm.createContext({
    window: {
      PropertyDeskScheduleUtils: {
        create(options) {
          calls.push(["schedule", options]);
          return {
            amountDueSince,
            monthlyScheduledEstimate,
            unpaidDueAccrualStart,
          };
        },
      },
      PropertyDeskLoanAmortizationUtils: {
        create(options) {
          calls.push(["loan", options]);
          return { amortizationSchedule, scheduledLoanBalance };
        },
      },
      PropertyDeskDepositLedgerUtils: {
        create(options) {
          calls.push(["deposit-calculations", options]);
          return { securityDepositBalance };
        },
      },
      PropertyDeskWorkspaceAccountFinancialContext: {
        create(options) {
          calls.push(["account-financials", options]);
          return {
            accountBalance,
            scheduledMonthlyRunRate,
            collectedSince,
            summarizeAccount,
          };
        },
      },
      PropertyDeskDepositContext: {
        create(options) {
          calls.push(["deposit-context", options]);
          return { depositLedger };
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

  const financial = context.window.PropertyDeskWorkspaceFinancialContext.create(
    {
      state,
      todayIso: () => "2026-10-07",
      postedLedgerUtils,
      isActiveAccount,
    },
  );

  assert.deepEqual(
    calls.map(([name]) => name),
    [
      "schedule",
      "loan",
      "deposit-calculations",
      "account-financials",
      "deposit-context",
    ],
  );
  assert.equal(calls[0][1].isDueReducingPayment, isDueReducingPayment);
  assert.equal(calls[0][1].isActiveAccount, isActiveAccount);
  assert.equal(calls[1][1].sumPosted, sumPosted);
  assert.equal(calls[2][1].isPosted, isPosted);
  assert.equal(calls[3][1].state, state);
  assert.equal(calls[3][1].amountDueSince, amountDueSince);
  assert.equal(calls[3][1].unpaidDueAccrualStart, unpaidDueAccrualStart);
  assert.equal(calls[4][1].state, state);
  assert.equal(calls[4][1].securityDepositBalance, securityDepositBalance);
  assert.equal(financial.amortizationSchedule, amortizationSchedule);
  assert.equal(financial.scheduledLoanBalance, scheduledLoanBalance);
  assert.equal(financial.amountDueSince, amountDueSince);
  assert.equal(financial.accountBalance, accountBalance);
  assert.equal(financial.scheduledMonthlyRunRate, scheduledMonthlyRunRate);
  assert.equal(financial.collectedSince, collectedSince);
  assert.equal(financial.summarizeAccount, summarizeAccount);
  assert.equal(financial.depositLedger, depositLedger);
  assert.equal(financial.isPosted, isPosted);
  assert.equal(financial.sumPosted, sumPosted);
});
