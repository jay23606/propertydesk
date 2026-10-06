/* Compose the security-deposit details view and its separate maintenance path. */
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
    const { depositSectionHTML } = window.PropertyDeskDepositWorkflow.create({
      state,
      depositLedger,
      money,
      fmtDate,
      esc,
    });
    const { recordDepositAdjustment } =
      window.PropertyDeskDepositMaintenance.create({
        state,
        moneyInput,
        todayIso,
        toast,
        fetchAll,
      });
    const { attachEvents } = window.PropertyDeskDepositDetailEvents.create({
      $,
      state,
      depositSectionHTML,
      recordDepositAdjustment,
    });

    return { depositSectionHTML, attachEvents };
  }

  window.PropertyDeskDepositDetailsWorkflow = Object.freeze({ create });
})();
