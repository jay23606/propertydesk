/* Compose account closure without pulling in rental deposit behavior. */
(() => {
  "use strict";

  function create(context) {
    const { $, state, toast, fetchAll, closeModal } = context;
    const { closeAccount } = window.PropertyDeskAccountMaintenance.create({
      $,
      state,
      toast,
      fetchAll,
      closeModal,
    });
    return { closeAccount };
  }

  window.PropertyDeskAccountMaintenanceWorkflow = Object.freeze({ create });
})();
