/* Compose account detail content with account and deposit actions. */
(() => {
  "use strict";

  function createAccountScreenWorkflow({ content, accountActions, deposit }) {
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
      depositLedger: content.depositLedger,
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
    const depositActions = window.PropertyDeskDepositAdjustmentWorkflow.create({
      $: deposit.$,
      state: deposit.state,
      todayIso: deposit.todayIso,
      toast: deposit.toast,
      fetchAll: deposit.fetchAll,
      depositSectionHTML: details.depositSectionHTML,
      moneyInput: deposit.moneyInput,
      repository: deposit.repository,
      prepareAdjustment: deposit.prepareAdjustment,
      validateAdjustment: deposit.validateAdjustment,
    });

    return {
      openAccountDetails: details.openAccountDetails,
      attachDepositAdjustmentEvents:
        depositActions.attachDepositAdjustmentEvents,
      attachAccountDetailActionEvents:
        accountDetailActions.attachAccountDetailActionEvents,
    };
  }

  window.PropertyDeskAccountScreenWorkflow = Object.freeze({
    create: createAccountScreenWorkflow,
  });
})();
