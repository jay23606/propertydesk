/* Compose deposit ledger preparation and its account detail renderer. */
(() => {
  "use strict";

  function createDepositDetails(context) {
    const { state, depositLedger, money, fmtDate, esc } = context;
    const { buildDepositDetails } =
      window.PropertyDeskDepositDetailsModel.create({ state, depositLedger });
    const { depositSectionHTML: renderDepositSection } =
      window.PropertyDeskDepositDetailsView.create({ money, fmtDate, esc });

    function depositSectionHTML(account) {
      return renderDepositSection(buildDepositDetails(account));
    }

    return { depositSectionHTML };
  }

  window.PropertyDeskDepositDetails = Object.freeze({
    create: createDepositDetails,
  });
})();
