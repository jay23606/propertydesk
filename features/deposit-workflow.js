/* Compose read-only security-deposit ledger details. */
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

  window.PropertyDeskDepositWorkflow = Object.freeze({ create });
})();
