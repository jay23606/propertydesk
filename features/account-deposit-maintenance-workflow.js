/* Compose account closure and rental deposit adjustments with their UI actions. */
(() => {
  "use strict";

  function createAccountDepositMaintenanceWorkflow({
    $,
    state,
    todayIso,
    toast,
    fetchAll,
    closeModal,
    editAccount,
    openPayment,
    depositSectionHTML,
    moneyInput,
  }) {
    const { saveDepositAdjustment } =
      window.PropertyDeskDepositMaintenance.create({
        state,
        todayIso,
        toast,
        fetchAll,
        repository: window.PropertyDeskDepositRepository,
        prepareAdjustment: window.PropertyDeskDepositAdjustmentModel.prepare,
      });
    const { recordDepositAdjustment } =
      window.PropertyDeskDepositAdjustmentEntry.create({
        state,
        moneyInput,
        toast,
        saveDepositAdjustment,
        validateAdjustment: window.PropertyDeskDepositAdjustmentModel.validate,
      });
    const { attachEvents: attachDepositEvents } =
      window.PropertyDeskDepositDetailEvents.create({
        $,
        state,
        depositSectionHTML,
        recordDepositAdjustment,
      });
    const { saveCloseAccount } =
      window.PropertyDeskAccountCloseMaintenance.create({
        state,
        toast,
        fetchAll,
        closeAccountDetails: () => closeModal($("detail-modal")),
        repository: window.PropertyDeskAccountRepository,
      });
    const { closeAccount } = window.PropertyDeskAccountCloseEntry.create({
      saveCloseAccount,
    });
    const { attachEvents: attachAccountDetailActionEvents } =
      window.PropertyDeskAccountDetailEvents.create({
        $,
        state,
        closeModal,
        editAccount,
        openPayment,
        closeAccount,
      });

    return {
      attachDepositEvents,
      attachAccountDetailActionEvents,
    };
  }

  window.PropertyDeskAccountDepositMaintenanceWorkflow = Object.freeze({
    create: createAccountDepositMaintenanceWorkflow,
  });
})();
