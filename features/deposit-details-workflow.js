/* Compose the rental deposit ledger model and detail view. */
(() => {
  "use strict";

  function create({ state, depositLedger, money, fmtDate, esc }) {
    const { buildDepositDetails } =
      window.PropertyDeskDepositDetailsModel.create({ state, depositLedger });
    const { depositSectionHTML: renderDepositDetails } =
      window.PropertyDeskDepositDetailsView.create({ money, fmtDate, esc });

    function depositSectionHTML(account) {
      return renderDepositDetails(buildDepositDetails(account));
    }

    return { depositSectionHTML };
  }

  window.PropertyDeskDepositDetailsWorkflow = Object.freeze({ create });
})();
