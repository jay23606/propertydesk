/* Compose account details, schedule, history, and rental deposit rendering. */
(() => {
  "use strict";

  function create({
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
    workflows,
  }) {
    const { loadAccountHistory } = workflows.accountHistoryModel.create({
      state,
      repository: accountHistoryRepository,
    });
    const { accountHistoryHTML } = workflows.accountHistoryView.create({
      esc,
      money,
      fmtDate,
    });
    async function renderAccountHistory(account, payments) {
      return accountHistoryHTML(await loadAccountHistory(account, payments));
    }
    const { accountLoanScheduleHTML } =
      workflows.accountLoanScheduleView.create({ money, fmtDate });
    const { renderAccountDetails } = workflows.accountDetailsView.create({
      money,
      fmtDate,
      esc,
      prettyType,
      paymentFrequencyLabel,
      accountLoanScheduleHTML,
    });
    const { buildAccountDetailData } = workflows.accountDetailsModel.create({
      state,
      sumPosted,
      summarizeAccount,
      amortizationSchedule,
      propertyAddress,
    });
    const { openAccountDetails } = workflows.accountDetails.create({
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
