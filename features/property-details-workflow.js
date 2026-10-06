/* Connect property-detail content with action and private-document workflows. */
(() => {
  "use strict";

  function create(context) {
    const {
      $,
      state,
      isPosted,
      sumIncome,
      sumOperatingExpenses,
      money,
      fmtDate,
      esc,
      prettyType,
      paymentFrequencyLabel,
      accountBalance,
      openModal,
      propertyAddress,
      toast,
      fetchAll,
      todayIso,
      closeModal,
      editAccount,
      openPayment,
      openExpense,
      openAccountForProperty,
      openAccountDetails,
    } = context;
    const { openPropertyDetails } =
      window.PropertyDeskPropertyDetailContentWorkflow.create({
        $,
        state,
        isPosted,
        sumIncome,
        sumOperatingExpenses,
        money,
        fmtDate,
        esc,
        prettyType,
        paymentFrequencyLabel,
        accountBalance,
        openModal,
        propertyAddress,
      });

    const { attachPropertyDetailEvents } =
      window.PropertyDeskPropertyDetailActionsWorkflow.create({
        $,
        state,
        toast,
        fetchAll,
        todayIso,
        openPropertyDetails,
        closeModal,
        editAccount,
        openPayment,
        openExpense,
        openAccountForProperty,
        openAccountDetails,
      });
    const { attachPropertyDocumentEvents } =
      window.PropertyDeskPropertyDocumentWorkflow.create({
        $,
        state,
        toast,
        fetchAll,
        openPropertyDetails,
      });

    return {
      openPropertyDetails,
      attachPropertyDetailEvents,
      attachPropertyDocumentEvents,
    };
  }

  window.PropertyDeskPropertyDetailsWorkflow = Object.freeze({ create });
})();
