/* Compose security-deposit adjustments with their account-detail event route. */
(() => {
  "use strict";

  function create(context) {
    const {
      $,
      state,
      moneyInput,
      todayIso,
      toast,
      fetchAll,
      depositSectionHTML,
    } = context;
    const { saveDepositAdjustment } =
      window.PropertyDeskDepositMaintenance.create({
        state,
        todayIso,
        toast,
        fetchAll,
      });
    const { recordDepositAdjustment } =
      window.PropertyDeskDepositAdjustmentEntry.create({
        state,
        moneyInput,
        toast,
        saveDepositAdjustment,
      });
    const { attachEvents } = window.PropertyDeskDepositDetailEvents.create({
      $,
      state,
      depositSectionHTML,
      recordDepositAdjustment,
    });

    return { attachEvents };
  }

  window.PropertyDeskDepositMaintenanceWorkflow = Object.freeze({ create });
})();
