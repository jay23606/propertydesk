/* Compose security-deposit rendering and its delegated maintenance actions. */
(() => {
  "use strict";

  function create(context) {
    const {
      $, state, depositLedger, money, fmtDate, esc, recordDepositAdjustment,
    } = context;
    const { depositSectionHTML } = window.PropertyDeskDepositDetails.create({
      state, depositLedger, money, fmtDate, esc,
    });
    const { attachEvents: attachDepositDetailEvents } =
      window.PropertyDeskDepositDetailEvents.create({
        $, state, depositSectionHTML, recordDepositAdjustment,
      });

    return { depositSectionHTML, attachDepositDetailEvents };
  }

  window.PropertyDeskDepositDetailsWorkflow = Object.freeze({ create });
})();
