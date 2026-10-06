/* Compose account closure with security-deposit maintenance. */
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
      closeModal,
    } = context;
    const depositWorkflow = window.PropertyDeskDepositWorkflow.create({
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
    });
    const { closeAccount } = window.PropertyDeskAccountMaintenance.create({
      $,
      state,
      toast,
      fetchAll,
      closeModal,
    });

    function attachEvents() {
      depositWorkflow.attachEvents();
    }

    return {
      depositSectionHTML: depositWorkflow.depositSectionHTML,
      closeAccount,
      attachEvents,
    };
  }

  window.PropertyDeskAccountMaintenanceWorkflow = Object.freeze({ create });
})();
