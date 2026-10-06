/* Compose account-detail content from its renderer and selected-account workflow. */
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
      depositSectionHTML,
      openModal,
      propertyAddress,
    } = context;
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
    return { openAccountDetails };
  }

  window.PropertyDeskAccountDetailsWorkflow = Object.freeze({ create });
})();
