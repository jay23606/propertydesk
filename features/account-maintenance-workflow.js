/* Compose account and security-deposit maintenance actions. */
(() => {
  "use strict";

  function create(context) {
    const { $, state, moneyInput, todayIso, toast, fetchAll, closeModal } =
      context;
    const { closeAccount } = window.PropertyDeskAccountMaintenance.create({
      $,
      state,
      toast,
      fetchAll,
      closeModal,
    });
    const { recordDepositAdjustment } =
      window.PropertyDeskDepositMaintenance.create({
        state,
        moneyInput,
        todayIso,
        toast,
        fetchAll,
      });

    return { closeAccount, recordDepositAdjustment };
  }

  window.PropertyDeskAccountMaintenanceWorkflow = Object.freeze({ create });
})();
