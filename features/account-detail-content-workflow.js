/* Compose account details, schedule, history, and rental deposit rendering. */
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
      summarizeAccount,
      amortizationSchedule,
      openModal,
      propertyAddress,
      depositSectionHTML,
      accountHistoryRepository,
    } = context;
    const { loadAccountHistory } =
      window.PropertyDeskAccountHistoryModel.create({
        state,
        repository: accountHistoryRepository,
      });
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
        summarizeAccount,
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

    return Object.freeze({ openAccountDetails });
  }

  window.PropertyDeskAccountDetailContentWorkflow = Object.freeze({ create });
})();
