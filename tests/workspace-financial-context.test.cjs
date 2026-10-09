const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("workspace financial context composes ledger, account, and loan services", () => {
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
  const accountBalance = () => 5;
  const scheduledMonthlyRunRate = () => 6;
  const collectedSince = () => 7;
  const summarizeAccount = () => ({});
  const postedLedgerUtils = {
    isDueReducingPayment,
    isPosted,
    paymentStatusInMonth() {},
    postedOnOrAfter,
    sumIncome() {},
    sumOperatingExpenses() {},
    sumPosted,
  };
  const context = vm.createContext({ window: {} });
  const workflows = {
    schedule: {
      create(options) {
        calls.push(["schedule", options]);
        return {
          amountDueSince,
          monthlyScheduledEstimate,
          unpaidDueAccrualStart,
        };
      },
    },
    loanSchedule: {
      create(options) {
        calls.push(["loan", options]);
        return { amortizationSchedule, scheduledLoanBalance };
      },
    },
    accountFinancialContext: {
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
    ledgerContext: { create() {} },
    accountSummary: { create() {} },
  };
  const todayIso = () => "2026-10-07";
  const monthDateWithAnchor = () => {};
  const isoDate = () => {};
  const roundCurrency = () => {};
  const dateUtils = {
    monthDateWithAnchor,
    isoDate,
    unrelatedDateHelper() {},
  };
  const currencyUtils = { roundCurrency, unrelatedCurrencyHelper() {} };
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
      todayIso,
      dateUtils,
      currencyUtils,
      postedLedgerUtils,
      isActiveAccount,
      workflows,
    },
  );

  assert.deepEqual(
    calls.map(([name]) => name),
    ["schedule", "loan", "account-financials"],
  );
  assert.equal(calls[0][1].isDueReducingPayment, isDueReducingPayment);
  assert.equal(calls[0][1].isActiveAccount, isActiveAccount);
  assert.equal(calls[0][1].monthDateWithAnchor, monthDateWithAnchor);
  assert.equal(calls[0][1].roundCurrency, roundCurrency);
  assert.deepEqual(Object.keys(calls[0][1]).sort(), [
    "isActiveAccount",
    "isDueReducingPayment",
    "monthDateWithAnchor",
    "roundCurrency",
  ]);
  assert.equal(calls[1][1].monthDateWithAnchor, monthDateWithAnchor);
  assert.equal(calls[1][1].isoDate, isoDate);
  assert.equal(calls[1][1].roundCurrency, roundCurrency);
  assert.deepEqual(Object.keys(calls[1][1]).sort(), [
    "isoDate",
    "monthDateWithAnchor",
    "roundCurrency",
    "todayIso",
  ]);
  assert.equal(calls[1][1].todayIso, todayIso);
  assert.equal(calls[2][1].state, state);
  assert.equal(calls[2][1].ledger.todayIso, todayIso);
  assert.equal(calls[2][1].ledger.scheduledLoanBalance, scheduledLoanBalance);
  assert.equal(
    calls[2][1].ledger.monthlyScheduledEstimate,
    monthlyScheduledEstimate,
  );
  assert.equal(calls[2][1].ledger.postedOnOrAfter, postedOnOrAfter);
  assert.equal(calls[2][1].ledger.sumPosted, sumPosted);
  assert.equal(calls[2][1].amountDueSince, amountDueSince);
  assert.equal(calls[2][1].unpaidDueAccrualStart, unpaidDueAccrualStart);
  assert.equal(financial.amortizationSchedule, amortizationSchedule);
  assert.equal(financial.amountDueSince, amountDueSince);
  assert.equal(financial.accountBalance, accountBalance);
  assert.equal(financial.scheduledMonthlyRunRate, scheduledMonthlyRunRate);
  assert.equal(financial.collectedSince, collectedSince);
  assert.equal(financial.summarizeAccount, summarizeAccount);
  assert.equal(financial.isPosted, isPosted);
  assert.equal(financial.sumPosted, sumPosted);
  assert.deepEqual(Object.keys(financial).sort(), [
    "accountBalance",
    "amortizationSchedule",
    "amountDueSince",
    "collectedSince",
    "isPosted",
    "monthlyScheduledEstimate",
    "paymentStatusInMonth",
    "postedOnOrAfter",
    "scheduledMonthlyRunRate",
    "sumIncome",
    "sumOperatingExpenses",
    "sumPosted",
    "summarizeAccount",
    "unpaidDueAccrualStart",
  ]);
});
