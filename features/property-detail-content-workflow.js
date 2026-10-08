/* Compose property lookup, activity, and detail content rendering. */
(() => {
  "use strict";

  function create({
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
    workflows,
  }) {
    const { propertyDocumentsHTML } = workflows.documentsView.create({
      fmtDate,
      esc,
    });
    const { propertyAccountsHTML } = workflows.accountTable.create({
      money,
      esc,
      prettyType,
      paymentFrequencyLabel,
      accountBalance,
    });
    const { propertyDetailsHTML } = workflows.detailsView.create({
      money,
      esc,
      propertyDocumentsHTML,
      propertyAccountsHTML,
    });
    const { renderPropertyActivity } = workflows.activityDetails.create({
      state,
      isPosted,
      sumIncome,
      sumOperatingExpenses,
      money,
      fmtDate,
      esc,
    });
    const { buildPropertyDetailData } = workflows.detailsModel.create({
      state,
      propertyAddress,
    });
    const { openPropertyDetails } = workflows.details.create({
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
