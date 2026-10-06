/* Compose the property details view with its actions and private documents. */
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
      resetAccountForm,
      populateFormOptions,
      openAccountDetails,
      documentRef = document,
    } = context;
    const { propertyDocumentsHTML } =
      window.PropertyDeskPropertyDocumentsView.create({ fmtDate, esc });
    const { propertyDetailsHTML } =
      window.PropertyDeskPropertyDetailsView.create({
        money,
        esc,
        prettyType,
        paymentFrequencyLabel,
        accountBalance,
        propertyDocumentsHTML,
      });
    const { renderPropertyActivity } =
      window.PropertyDeskPropertyActivityDetails.create({
        state,
        isPosted,
        sumIncome,
        sumOperatingExpenses,
        money,
        fmtDate,
        esc,
      });
    const { openPropertyDetails } = window.PropertyDeskPropertyDetails.create({
      $,
      state,
      money,
      fmtDate,
      esc,
      prettyType,
      paymentFrequencyLabel,
      accountBalance,
      openModal,
      propertyAddress,
      renderPropertyActivity,
      propertyDetailsHTML,
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
        resetAccountForm,
        populateFormOptions,
        openModal,
        openAccountDetails,
        documentRef,
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
