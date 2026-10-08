/* Compose account details with their account-specific actions. */
(() => {
  "use strict";

  function createAccountScreenWorkflow({ content, accountActions }) {
    const details = window.PropertyDeskAccountDetailContentWorkflow.create({
      $: content.$,
      state: content.state,
      money: content.money,
      fmtDate: content.fmtDate,
      esc: content.esc,
      sumPosted: content.sumPosted,
      prettyType: content.prettyType,
      paymentFrequencyLabel: content.paymentFrequencyLabel,
      summarizeAccount: content.summarizeAccount,
      amortizationSchedule: content.amortizationSchedule,
      openModal: content.openModal,
      propertyAddress: content.propertyAddress,
      depositSectionHTML: content.depositSectionHTML,
      accountHistoryRepository: content.accountHistoryRepository,
    });
    const accountDetailActions =
      window.PropertyDeskAccountDetailActionWorkflow.create({
        $: accountActions.$,
        state: accountActions.state,
        toast: accountActions.toast,
        fetchAll: accountActions.fetchAll,
        closeModal: accountActions.closeModal,
        editAccount: accountActions.editAccount,
        openPayment: accountActions.openPayment,
        repository: accountActions.repository,
      });
    return {
      openAccountDetails: details.openAccountDetails,
      attachAccountDetailActionEvents:
        accountDetailActions.attachAccountDetailActionEvents,
    };
  }

  window.PropertyDeskAccountScreenWorkflow = Object.freeze({
    create: createAccountScreenWorkflow,
  });
})();
