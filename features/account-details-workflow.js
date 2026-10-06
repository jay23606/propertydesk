/* Compose account details, payment history, deposit ledger, and modal actions. */
(() => {
  "use strict";

  function create(context) {
    const {
      $,
      state,
      money,
      fmtDate,
      esc,
      isPosted,
      prettyType,
      paymentFrequencyLabel,
      accountBalance,
      amortizationSchedule,
      amountDueSince,
      unpaidDueAccrualStart,
      todayIso,
      toast,
      fetchAll,
      depositSectionHTML,
      attachDepositEvents,
      openModal,
      propertyAddress,
      closeModal,
      editAccount,
      openPayment,
    } = context;
    const { closeAccount } = window.PropertyDeskAccountMaintenance.create({
      $,
      state,
      toast,
      fetchAll,
      closeModal,
    });
    const { renderAccountDetails } =
      window.PropertyDeskAccountDetailsView.create({
        money,
        fmtDate,
        esc,
        prettyType,
        paymentFrequencyLabel,
      });
    const { renderAccountHistory } =
      window.PropertyDeskAccountHistoryDetails.create({
        state,
        esc,
        money,
        fmtDate,
      });
    const { openAccountDetails } = window.PropertyDeskAccountDetails.create({
      $,
      state,
      isPosted,
      money,
      fmtDate,
      esc,
      prettyType,
      paymentFrequencyLabel,
      accountBalance,
      amortizationSchedule,
      amountDueSince,
      unpaidDueAccrualStart,
      todayIso,
      depositSectionHTML,
      renderAccountHistory,
      renderAccountDetails,
      openModal,
      propertyAddress,
    });
    const { attachEvents: attachAccountDetailEvents } =
      window.PropertyDeskAccountDetailEvents.create({
        $,
        state,
        closeModal,
        editAccount,
        openPayment,
        closeAccount,
      });

    function attachEvents() {
      attachDepositEvents();
      attachAccountDetailEvents();
    }

    return {
      openAccountDetails,
      attachEvents,
    };
  }

  window.PropertyDeskAccountDetailsWorkflow = Object.freeze({ create });
})();
