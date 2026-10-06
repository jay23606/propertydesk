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

    return { attachEvents };
  }

  window.PropertyDeskDepositMaintenanceWorkflow = Object.freeze({ create });
})();
