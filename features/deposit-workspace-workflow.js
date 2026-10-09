/* Connect rental deposit details with their adjustment actions. */
(() => {
  "use strict";

  function createDepositWorkspaceWorkflow({ details, adjustments, workflows }) {
    const { buildDepositDetails } = workflows.detailsModel.create({
      depositLedger: details.depositLedger,
    });
    const { depositSectionHTML: renderDepositDetails } =
      workflows.detailsView.create({
        money: details.money,
        fmtDate: details.fmtDate,
        esc: details.esc,
      });

    function depositSectionHTML(account) {
      return renderDepositDetails(buildDepositDetails(account));
    }

    const { attachDepositAdjustmentEvents } =
      workflows.adjustmentWorkflow.create({
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
        resolveAdjustmentType: adjustments.resolveAdjustmentType,
        writeFeedback: adjustments.writeFeedback,
        promptAction: adjustments.promptAction,
        workflows: workflows.adjustmentModules,
      });

    return Object.freeze({ depositSectionHTML, attachDepositAdjustmentEvents });
  }

  window.PropertyDeskDepositWorkspaceWorkflow = Object.freeze({
    create: createDepositWorkspaceWorkflow,
  });
})();
