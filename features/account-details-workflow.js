/* Connect account-detail content with account-action and deposit workflows. */
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
      depositLedger,
      moneyInput,
      openModal,
      propertyAddress,
      closeModal,
      editAccount,
      openPayment,
    } = context;
    const depositWorkflow = window.PropertyDeskDepositDetailsWorkflow.create({
      $,
      state,
      depositLedger,
      money,
      fmtDate,
      esc,
      moneyInput,
      todayIso,
      toast,
      fetchAll,
    });
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
        depositSectionHTML: depositWorkflow.depositSectionHTML,
        openModal,
        propertyAddress,
      });
    return {
      openAccountDetails,
      attachEvents: accountMaintenance.attachEvents,
      attachDepositEvents: depositWorkflow.attachEvents,
    };
  }

  window.PropertyDeskAccountDetailsWorkflow = Object.freeze({ create });
})();
