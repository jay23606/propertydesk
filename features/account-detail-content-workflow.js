/* Compose the account detail view, history, schedule, and lookup actions. */
(() => {
  "use strict";

  function create(context) {
    const {
      $,
      state,
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
      depositSectionHTML,
    } = context;
    const { loadAccountHistory } =
      window.PropertyDeskAccountHistoryModel.create({ state });
    const { accountHistoryHTML } = window.PropertyDeskAccountHistoryView.create(
      {
        esc,
        money,
        fmtDate,
      },
    );
    async function renderAccountHistory(account, payments) {
      return accountHistoryHTML(await loadAccountHistory(account, payments));
    }
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

    return { openAccountDetails };
  }

  window.PropertyDeskAccountDetailContentWorkflow = Object.freeze({ create });
})();
