/* Compose account details, payment history, deposit ledger, and modal actions. */
(() => {
  "use strict";

  function create(context) {
    const {
      $, state, depositLedger, money, fmtDate, esc, isPosted, prettyType,
      paymentFrequencyLabel, accountBalance, amortizationSchedule, amountDueSince,
      unpaidDueAccrualStart, todayIso, openModal, propertyAddress, closeModal,
      editAccount, openPayment, closeAccount, recordDepositAdjustment,
    } = context;
    const { renderAccountDetails } = window.PropertyDeskAccountDetailsView.create({
      money, fmtDate, esc, prettyType, paymentFrequencyLabel,
    });
    const { depositSectionHTML } = window.PropertyDeskDepositDetails.create({
      state, depositLedger, money, fmtDate, esc,
    });
    const { renderAccountHistory } = window.PropertyDeskAccountHistoryDetails.create({
      state, esc, money, fmtDate,
    });
    const { openAccountDetails } = window.PropertyDeskAccountDetails.create({
      $, state, isPosted, money, fmtDate, esc, prettyType, paymentFrequencyLabel,
      accountBalance, amortizationSchedule, amountDueSince, unpaidDueAccrualStart,
      todayIso, depositSectionHTML, renderAccountHistory, renderAccountDetails,
      openModal, propertyAddress,
    });
    const { attachEvents: attachAccountDetailEvents } =
      window.PropertyDeskAccountDetailEvents.create({
        $, state, closeModal, editAccount, openPayment, closeAccount,
      });
    const { attachEvents: attachDepositDetailEvents } =
      window.PropertyDeskDepositDetailEvents.create({
        $, state, depositSectionHTML, recordDepositAdjustment,
      });

    return {
      openAccountDetails,
      attachAccountDetailEvents,
      attachDepositDetailEvents,
    };
  }

  window.PropertyDeskAccountDetailsWorkflow = Object.freeze({ create });
})();
