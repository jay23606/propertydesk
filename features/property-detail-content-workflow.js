/* Compose property lookup, activity, and detail content rendering. */
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

    return { openPropertyDetails };
  }

  window.PropertyDeskPropertyDetailContentWorkflow = Object.freeze({ create });
})();
