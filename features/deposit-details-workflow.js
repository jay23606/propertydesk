/* Compose security-deposit ledger data and its account-detail renderer. */
(() => {
  "use strict";

  function create(context) {
    const { state, depositLedger, money, fmtDate, esc } = context;
    const { depositSectionHTML } = window.PropertyDeskDepositDetails.create({
      state,
      depositLedger,
      money,
      fmtDate,
      esc,
    });
    return { depositSectionHTML };
  }

  window.PropertyDeskDepositDetailsWorkflow = Object.freeze({ create });
})();
