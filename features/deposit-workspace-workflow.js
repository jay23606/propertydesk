/* Connect rental deposit details with their adjustment actions. */
(() => {
  "use strict";

  function createDepositWorkspaceWorkflow({ details, adjustments }) {
    const { buildDepositDetails } =
      window.PropertyDeskDepositDetailsModel.create({
        state: details.state,
        depositLedger: details.depositLedger,
      });
    const { depositSectionHTML: renderDepositDetails } =
      window.PropertyDeskDepositDetailsView.create({
        money: details.money,
        fmtDate: details.fmtDate,
        esc: details.esc,
      });

    function depositSectionHTML(account) {
      return renderDepositDetails(buildDepositDetails(account));
    }

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
        resolveAdjustmentType: adjustments.resolveAdjustmentType,
      });

    return Object.freeze({ depositSectionHTML, attachDepositAdjustmentEvents });
  }

  window.PropertyDeskDepositWorkspaceWorkflow = Object.freeze({
    create: createDepositWorkspaceWorkflow,
  });
})();
