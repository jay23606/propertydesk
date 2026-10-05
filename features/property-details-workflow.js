/* Compose property activity summaries with the property details view. */
(() => {
  "use strict";

  function create(context) {
    const {
      $, state, isPosted, sumIncome, sumOperatingExpenses, money, fmtDate, esc,
      prettyType, paymentFrequencyLabel, accountBalance, openModal, propertyAddress,
    } = context;
    const { renderPropertyActivity } =
      window.PropertyDeskPropertyActivityDetails.create({
        state, isPosted, sumIncome, sumOperatingExpenses, money, fmtDate, esc,
      });
    const { openPropertyDetails } = window.PropertyDeskPropertyDetails.create({
      $, state, money, fmtDate, esc, prettyType, paymentFrequencyLabel,
      accountBalance, openModal, propertyAddress, renderPropertyActivity,
    });

    return { renderPropertyActivity, openPropertyDetails };
  }

  window.PropertyDeskPropertyDetailsWorkflow = Object.freeze({ create });
})();
