/* Compose rental deposit adjustments with their detail-modal actions. */
(() => {
  "use strict";

  function createDepositAdjustmentWorkflow({
    $,
    state,
    todayIso,
    toast,
    fetchAll,
    depositSectionHTML,
    moneyInput,
    repository,
    prepareAdjustment,
    validateAdjustment,
    resolveAdjustmentType,
  }) {
    const { saveDepositAdjustment } =
      window.PropertyDeskDepositMaintenance.create({
        state,
        todayIso,
        toast,
        fetchAll,
        repository,
        prepareAdjustment,
        resolveAdjustmentType,
      });
    const { recordDepositAdjustment } =
      window.PropertyDeskDepositAdjustmentEntry.create({
        state,
        moneyInput,
        toast,
        saveDepositAdjustment,
        validateAdjustment,
        resolveAdjustmentType,
      });
    const { attachDepositAdjustmentEvents } =
      window.PropertyDeskDepositDetailEvents.create({
        $,
        state,
        depositSectionHTML,
        recordDepositAdjustment,
      });

    return Object.freeze({ attachDepositAdjustmentEvents });
  }

  window.PropertyDeskDepositAdjustmentWorkflow = Object.freeze({
    create: createDepositAdjustmentWorkflow,
  });
})();
