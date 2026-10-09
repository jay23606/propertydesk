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
    saveAndRefreshWorkspaceRecord,
    promptAction,
    workflows,
  }) {
    const { saveDepositAdjustment } = workflows.maintenance.create({
      state,
      todayIso,
      toast,
      fetchAll,
      repository,
      prepareAdjustment,
      resolveAdjustmentType,
      saveAndRefreshWorkspaceRecord,
    });
    const { recordDepositAdjustment } = workflows.entry.create({
      state,
      moneyInput,
      toast,
      saveDepositAdjustment,
      validateAdjustment,
      resolveAdjustmentType,
      promptAction,
    });
    const { attachDepositAdjustmentEvents } = workflows.events.create({
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
