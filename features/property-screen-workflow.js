/* Compose property detail content with its management and document actions. */
(() => {
  "use strict";

  function createPropertyScreenWorkflow({
    content,
    management,
    holders,
    documents,
    workflows,
  }) {
    const details = workflows.content.create({
      $: content.$,
      state: content.state,
      isPosted: content.isPosted,
      sumIncome: content.sumIncome,
      sumOperatingExpenses: content.sumOperatingExpenses,
      money: content.money,
      fmtDate: content.fmtDate,
      esc: content.esc,
      prettyType: content.prettyType,
      paymentFrequencyLabel: content.paymentFrequencyLabel,
      accountBalance: content.accountBalance,
      openModal: content.openModal,
      propertyAddress: content.propertyAddress,
      workflows: workflows.contentModules,
    });
    const actions = workflows.management.create({
      $: management.$,
      state: management.state,
      toast: management.toast,
      fetchAll: management.fetchAll,
      todayIso: management.todayIso,
      openPropertyDetails: details.openPropertyDetails,
      closeModal: management.closeModal,
      editAccount: management.editAccount,
      openAccountDetails: management.openAccountDetails,
      openPayment: management.openPayment,
      openExpense: management.openExpense,
      openAccountForProperty: management.openAccountForProperty,
      propertyRepository: management.propertyRepository,
      saveAndRefreshWorkspaceRecord: management.saveAndRefreshWorkspaceRecord,
      workflows: workflows.managementModules,
    });
    const { attachPropertyHolderEvents } = workflows.holders.create({
      $: holders.$,
      state: holders.state,
      toast: holders.toast,
      fetchAll: holders.fetchAll,
      repository: holders.repository,
      writeFeedback: holders.writeFeedback,
      openPropertyDetails: details.openPropertyDetails,
      workflows: workflows.holderModules,
    });
    const { attachPropertyDocumentEvents } = documents.workflow.create({
      $: documents.$,
      state: documents.state,
      toast: documents.toast,
      fetchAll: documents.fetchAll,
      openPropertyDetails: details.openPropertyDetails,
      repository: documents.documentRepository,
      refreshWorkspace: documents.refreshWorkspace,
      confirm: documents.confirm,
      openWindow: documents.openWindow,
      modules: documents.modules,
      documentsWorkflow: documents.documentsWorkflow,
      documentEventsWorkflow: documents.documentEventsWorkflow,
    });

    return Object.freeze({
      openPropertyDetails: details.openPropertyDetails,
      attachPropertyDetailEvents: actions.attachPropertyDetailEvents,
      attachPropertyQuickActionEvents: actions.attachPropertyQuickActionEvents,
      attachPropertyHolderEvents,
      attachPropertyDocumentEvents,
    });
  }

  window.PropertyDeskPropertyScreenWorkflow = Object.freeze({
    create: createPropertyScreenWorkflow,
  });
})();
