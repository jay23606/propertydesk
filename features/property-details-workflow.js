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
    } = context;
    const { propertyDetailsHTML } =
      window.PropertyDeskPropertyDetailsView.create({
        money,
        fmtDate,
        esc,
        prettyType,
        paymentFrequencyLabel,
        accountBalance,
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
        ...context,
        openPropertyDetails,
      });
    const { attachPropertyDocumentEvents } =
      window.PropertyDeskPropertyDocumentWorkflow.create({
        $,
        state,
        toast: context.toast,
        fetchAll: context.fetchAll,
        openPropertyDetails,
      });

    return {
      renderPropertyActivity,
      openPropertyDetails,
      attachPropertyDetailEvents,
      attachPropertyDocumentEvents,
    };
  }

  window.PropertyDeskPropertyDetailsWorkflow = Object.freeze({ create });
})();
