/* Compose security-deposit rendering and its delegated maintenance actions. */
(() => {
  "use strict";

  function create(context) {
    const {
      $, state, depositLedger, money, fmtDate, esc, moneyInput, todayIso,
      toast, fetchAll,
    } = context;
    const { recordDepositAdjustment } =
      window.PropertyDeskDepositMaintenance.create({
        state, moneyInput, todayIso, toast, fetchAll,
      });
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
