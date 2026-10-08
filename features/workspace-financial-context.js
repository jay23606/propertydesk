/* Compose workspace payment and loan calculation services. */
(() => {
  "use strict";

  function createWorkspaceFinancialContext({
    state,
    todayIso,
    postedLedgerUtils,
    isActiveAccount,
  }) {
    const schedule = window.PropertyDeskScheduleUtils.create({
      isDueReducingPayment: postedLedgerUtils.isDueReducingPayment,
      isActiveAccount,
    });
    const loanSchedule = window.PropertyDeskLoanAmortizationUtils.create();
    const financial =
      window.PropertyDeskWorkspaceAccountFinancialContext.create({
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
