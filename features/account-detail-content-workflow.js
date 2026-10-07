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
      accountBalance,
      amortizationSchedule,
      amountDueSince,
      unpaidDueAccrualStart,
      todayIso,
      openModal,
      propertyAddress,
      depositLedger,
      accountHistoryRepository,
    } = context;
    const { buildDepositDetails } =
      window.PropertyDeskDepositDetailsModel.create({ state, depositLedger });
    const { depositSectionHTML: renderDepositDetails } =
      window.PropertyDeskDepositDetailsView.create({ money, fmtDate, esc });
    function depositSectionHTML(account) {
      return renderDepositDetails(buildDepositDetails(account));
    }
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
