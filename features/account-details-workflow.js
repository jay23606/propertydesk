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
      depositLedger,
      moneyInput,
      openModal,
      propertyAddress,
      closeModal,
      editAccount,
      openPayment,
    } = context;
    const depositWorkflow = window.PropertyDeskDepositWorkflow.create({
      state,
      depositLedger,
      money,
      fmtDate,
      esc,
    });
    const { recordDepositAdjustment } =
      window.PropertyDeskDepositMaintenance.create({
        state,
        moneyInput,
        todayIso,
        toast,
        fetchAll,
      });
    const { attachEvents: attachDepositEvents } =
      window.PropertyDeskDepositDetailEvents.create({
        $,
        state,
        depositSectionHTML: depositWorkflow.depositSectionHTML,
        recordDepositAdjustment,
      });
    const { closeAccount } = window.PropertyDeskAccountMaintenance.create({
      $,
      state,
      toast,
      fetchAll,
      closeModal,
    });
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
      depositSectionHTML: depositWorkflow.depositSectionHTML,
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

    function attachAccountEvents() {
      attachAccountDetailEvents();
    }

    return {
      openAccountDetails,
      attachEvents: attachAccountEvents,
      attachDepositEvents,
    };
  }

  window.PropertyDeskAccountDetailsWorkflow = Object.freeze({ create });
})();
