/* Compose security-deposit ledger maintenance, rendering, and events. */
(() => {
  "use strict";

  function create(context) {
    const {
      $,
      state,
      depositLedger,
      money,
      fmtDate,
      esc,
      moneyInput,
      todayIso,
      toast,
      fetchAll,
    } = context;
    const { recordDepositAdjustment } =
      window.PropertyDeskDepositMaintenance.create({
        state,
        moneyInput,
        todayIso,
        toast,
        fetchAll,
      });
    const { depositSectionHTML } = window.PropertyDeskDepositDetails.create({
      state,
      depositLedger,
      money,
      fmtDate,
      esc,
    });
    const { attachEvents } = window.PropertyDeskDepositDetailEvents.create({
      $,
      state,
      depositSectionHTML,
      recordDepositAdjustment,
    });

    return { depositSectionHTML, attachEvents };
  }

  window.PropertyDeskDepositWorkflow = Object.freeze({ create });
})();
