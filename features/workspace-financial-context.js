/* Compose workspace payment and loan calculation services. */
(() => {
  "use strict";

  function createWorkspaceFinancialContext({
    state,
    todayIso,
    dateUtils,
    currencyUtils,
    postedLedgerUtils,
    isActiveAccount,
    workflows,
  }) {
    const { monthDateWithAnchor, isoDate } = dateUtils;
    const { roundCurrency } = currencyUtils;
    const schedule = workflows.schedule.create({
      monthDateWithAnchor,
      roundCurrency,
      isDueReducingPayment: postedLedgerUtils.isDueReducingPayment,
      isActiveAccount,
    });
    const loanSchedule = workflows.loanSchedule.create({
      monthDateWithAnchor,
      isoDate,
      roundCurrency,
      todayIso,
    });
    const financial = workflows.accountFinancialContext.create({
      state,
      ledger: {
        todayIso,
        scheduledLoanBalance: loanSchedule.scheduledLoanBalance,
        monthlyScheduledEstimate: schedule.monthlyScheduledEstimate,
        postedOnOrAfter: postedLedgerUtils.postedOnOrAfter,
        sumPosted: postedLedgerUtils.sumPosted,
      },
      amountDueSince: schedule.amountDueSince,
      unpaidDueAccrualStart: schedule.unpaidDueAccrualStart,
      workflows: {
        ledger: workflows.ledgerContext,
        accountSummary: workflows.accountSummary,
      },
    });
    return Object.freeze({
      isPosted: postedLedgerUtils.isPosted,
      paymentStatusInMonth: postedLedgerUtils.paymentStatusInMonth,
      postedOnOrAfter: postedLedgerUtils.postedOnOrAfter,
      sumIncome: postedLedgerUtils.sumIncome,
      sumOperatingExpenses: postedLedgerUtils.sumOperatingExpenses,
      sumPosted: postedLedgerUtils.sumPosted,
      amountDueSince: schedule.amountDueSince,
      monthlyScheduledEstimate: schedule.monthlyScheduledEstimate,
      unpaidDueAccrualStart: schedule.unpaidDueAccrualStart,
      amortizationSchedule: loanSchedule.amortizationSchedule,
      accountBalance: financial.accountBalance,
      scheduledMonthlyRunRate: financial.scheduledMonthlyRunRate,
      collectedSince: financial.collectedSince,
      summarizeAccount: financial.summarizeAccount,
    });
  }

  window.PropertyDeskWorkspaceFinancialContext = Object.freeze({
    create: createWorkspaceFinancialContext,
  });
})();
