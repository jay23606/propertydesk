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
  }) {
    const { saveDepositAdjustment } =
      window.PropertyDeskDepositMaintenance.create({
        state,
        todayIso,
        toast,
        fetchAll,
        repository,
        prepareAdjustment,
      });
    const { recordDepositAdjustment } =
      window.PropertyDeskDepositAdjustmentEntry.create({
        state,
        moneyInput,
        toast,
        saveDepositAdjustment,
        validateAdjustment,
      });
    const { attachDepositAdjustmentEvents } =
      window.PropertyDeskDepositDetailEvents.create({
        $,
        state,
        depositSectionHTML,
        recordDepositAdjustment,
      });

    return { attachDepositAdjustmentEvents };
  }

  window.PropertyDeskDepositAdjustmentWorkflow = Object.freeze({
    create: createDepositAdjustmentWorkflow,
  });
})();
