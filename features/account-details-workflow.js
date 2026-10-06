/* Compose account details, deposit views, and their maintenance actions. */
(() => {
  "use strict";

  function create(context) {
    const {
      $,
      state,
      toast,
      fetchAll,
      money,
      moneyInput,
      todayIso,
      depositLedger,
      fmtDate,
      esc,
      closeModal,
      editAccount,
      openPayment,
      sumPosted,
      prettyType,
      paymentFrequencyLabel,
      accountBalance,
      amortizationSchedule,
      amountDueSince,
      unpaidDueAccrualStart,
      openModal,
      propertyAddress,
    } = context;
    const { depositSectionHTML } =
      window.PropertyDeskDepositDetailsWorkflow.create({
        state,
        depositLedger,
        money,
        fmtDate,
        esc,
      });
    const { attachEvents: attachDepositEvents } =
      window.PropertyDeskDepositMaintenanceWorkflow.create({
        $,
        state,
        moneyInput,
        todayIso,
        toast,
        fetchAll,
        depositSectionHTML,
      });
    const { attachEvents: attachAccountDetailActionEvents } =
      window.PropertyDeskAccountDetailActionsWorkflow.create({
        $,
        state,
        toast,
        fetchAll,
        closeModal,
        editAccount,
        openPayment,
      });
    const { renderAccountHistory } =
      window.PropertyDeskAccountHistoryDetails.create({
        state,
        esc,
        money,
        fmtDate,
      });
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
        accountBalance,
        amortizationSchedule,
        amountDueSince,
        unpaidDueAccrualStart,
        todayIso,
        depositSectionHTML,
        renderAccountHistory,
        openModal,
        propertyAddress,
      });

    return {
      attachAccountDetailActionEvents,
      attachDepositEvents,
      openAccountDetails,
    };
  }

  window.PropertyDeskAccountDetailsWorkflow = Object.freeze({ create });
})();
