/* Connect account details and actions with the rental deposit workspace. */
(() => {
  "use strict";

  function createAccountDepositWorkspaceWorkflow({
    deposit,
    accountDetails: {
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
      accountHistoryRepository,
    },
    accountActions,
  }) {
    const depositWorkspace =
      window.PropertyDeskDepositWorkspaceWorkflow.create(deposit);
    const { openAccountDetails } =
      window.PropertyDeskAccountDetailContentWorkflow.create({
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
        accountHistoryRepository,
        depositSectionHTML: depositWorkspace.depositSectionHTML,
      });
    const { attachAccountDetailActionEvents } =
      window.PropertyDeskAccountDetailActionWorkflow.create(accountActions);

    return Object.freeze({
      attachAccountDetailActionEvents,
      attachDepositAdjustmentEvents:
        depositWorkspace.attachDepositAdjustmentEvents,
      openAccountDetails,
    });
  }

  window.PropertyDeskAccountDepositWorkspaceWorkflow = Object.freeze({
    create: createAccountDepositWorkspaceWorkflow,
  });
})();
