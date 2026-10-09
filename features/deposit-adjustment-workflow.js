/* Compose rental deposit adjustments with their detail-modal actions. */
(() => {
  "use strict";

  function createDepositAdjustmentWorkflow({
    $,
    getAccount,
    getWorkspaceOwnerId,
    getCollection,
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
      getAccount,
      getWorkspaceOwnerId,
      getCollection,
      todayIso,
      toast,
      fetchAll,
      repository,
      prepareAdjustment,
      resolveAdjustmentType,
      saveAndRefreshWorkspaceRecord,
    });
    const { recordDepositAdjustment } = workflows.entry.create({
      getAccount,
      moneyInput,
      toast,
      saveDepositAdjustment,
      validateAdjustment,
      resolveAdjustmentType,
      promptAction,
    });
    const { attachDepositAdjustmentEvents } = workflows.events.create({
      $,
      getAccount,
      depositSectionHTML,
      recordDepositAdjustment,
    });

    return Object.freeze({ attachDepositAdjustmentEvents });
  }

  window.PropertyDeskDepositAdjustmentWorkflow = Object.freeze({
    create: createDepositAdjustmentWorkflow,
  });
})();
