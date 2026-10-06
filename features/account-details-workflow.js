/* Connect account-detail content with its separate action workflow. */
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
      openModal,
      propertyAddress,
      closeModal,
      editAccount,
      openPayment,
    } = context;
    const accountMaintenance =
      window.PropertyDeskAccountDetailActionsWorkflow.create({
        $,
        state,
        toast,
        fetchAll,
        closeModal,
        editAccount,
        openPayment,
      });
    const { openAccountDetails } =
      window.PropertyDeskAccountDetailContentWorkflow.create({
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
        depositSectionHTML,
        openModal,
        propertyAddress,
      });
    return {
      openAccountDetails,
      attachEvents: accountMaintenance.attachEvents,
    };
  }

  window.PropertyDeskAccountDetailsWorkflow = Object.freeze({ create });
})();
