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
    const { propertyAccountsHTML } =
      window.PropertyDeskPropertyDetailsAccountTable.create({
        money,
        esc,
        prettyType,
        paymentFrequencyLabel,
        accountBalance,
      });
    const { propertyDetailsHTML } =
      window.PropertyDeskPropertyDetailsView.create({
        money,
        esc,
        propertyDocumentsHTML,
        propertyAccountsHTML,
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
    const { buildPropertyDetailData } =
      window.PropertyDeskPropertyDetailsModel.create({
        state,
        propertyAddress,
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
      buildPropertyDetailData,
      renderPropertyActivity,
      propertyDetailsHTML,
    });

    return Object.freeze({ openPropertyDetails });
  }

  window.PropertyDeskPropertyDetailContentWorkflow = Object.freeze({ create });
})();
