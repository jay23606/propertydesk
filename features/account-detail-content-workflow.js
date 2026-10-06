/* Compose the account detail view, history, schedule, and lookup actions. */
(() => {
  "use strict";

  function create(context) {
    const {
      $,
      state,
      depositLedger,
      money,
      fmtDate,
      esc,
      sumPosted,
      prettyType,
      paymentFrequencyLabel,
      accountBalance,
      amortizationSchedule,
      amountDueSince,
      unpaidDueAccrualStart,
      todayIso,
      openModal,
      propertyAddress,
    } = context;
    const { depositSectionHTML } = window.PropertyDeskDepositDetails.create({
      state,
      depositLedger,
      money,
      fmtDate,
      esc,
    });
    const { renderAccountHistory } =
      window.PropertyDeskAccountHistoryDetails.create({
        state,
        esc,
        money,
        fmtDate,
      });
    const { accountLoanScheduleHTML } =
      window.PropertyDeskAccountLoanScheduleView.create({ money, fmtDate });
    const { renderAccountDetails } =
      window.PropertyDeskAccountDetailsView.create({
        money,
        fmtDate,
        esc,
        prettyType,
        paymentFrequencyLabel,
        accountLoanScheduleHTML,
      });
    const { buildAccountDetailData } =
      window.PropertyDeskAccountDetailsModel.create({
        state,
        sumPosted,
        summarizeAccount: window.PropertyDeskAccountFinancialSummary.create({
          accountBalance,
          amountDueSince,
          unpaidDueAccrualStart,
          todayIso,
        }).summarizeAccount,
        amortizationSchedule,
        propertyAddress,
      });
    const { openAccountDetails } = window.PropertyDeskAccountDetails.create({
      $,
      state,
      buildAccountDetailData,
      fmtDate,
      depositSectionHTML,
      renderAccountHistory,
      renderAccountDetails,
      openModal,
    });

    return { openAccountDetails, depositSectionHTML };
  }

  window.PropertyDeskAccountDetailContentWorkflow = Object.freeze({ create });
})();
