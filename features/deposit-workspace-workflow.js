/* Connect rental deposit details with their adjustment actions. */
(() => {
  "use strict";

  function createDepositWorkspaceWorkflow({ details, adjustments }) {
    const { depositSectionHTML } =
      window.PropertyDeskDepositDetailsWorkflow.create({
        state: details.state,
        depositLedger: details.depositLedger,
        money: details.money,
        fmtDate: details.fmtDate,
        esc: details.esc,
      });
    const { attachDepositAdjustmentEvents } =
      window.PropertyDeskDepositAdjustmentWorkflow.create({
        $: adjustments.$,
        state: adjustments.state,
        todayIso: adjustments.todayIso,
        toast: adjustments.toast,
        fetchAll: adjustments.fetchAll,
        depositSectionHTML,
        moneyInput: adjustments.moneyInput,
        repository: adjustments.repository,
        prepareAdjustment: adjustments.prepareAdjustment,
        validateAdjustment: adjustments.validateAdjustment,
      });

    return { depositSectionHTML, attachDepositAdjustmentEvents };
  }

  window.PropertyDeskDepositWorkspaceWorkflow = Object.freeze({
    create: createDepositWorkspaceWorkflow,
  });
})();
