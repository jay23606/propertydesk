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
      beginAuditRequest: content.beginAuditRequest,
      setSelectedPropertyId: content.setSelectedPropertyId,
      getPayments: content.getPayments,
      getExpenses: content.getExpenses,
      getProperties: content.getProperties,
      getAccounts: content.getAccounts,
      getDocuments: content.getDocuments,
      getWorkspaceMembers: content.getWorkspaceMembers,
      getPropertyHolders: content.getPropertyHolders,
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
      getSelectedPropertyId: management.getSelectedPropertyId,
      getProperties: management.getProperties,
      getWorkspaceOwnerId: management.getWorkspaceOwnerId,
      getAccounts: management.getAccounts,
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
      getSelectedPropertyId: holders.getSelectedPropertyId,
      getWorkspaceOwnerId: holders.getWorkspaceOwnerId,
      getPropertyHolders: holders.getPropertyHolders,
      toast: holders.toast,
      fetchAll: holders.fetchAll,
      repository: holders.repository,
      reconcileWorkspaceChange: holders.reconcileWorkspaceChange,
      refreshWorkspace: holders.refreshWorkspace,
      openPropertyDetails: details.openPropertyDetails,
      workflows: workflows.holderModules,
    });
    const { attachPropertyDocumentEvents } = documents.workflow.create({
      $: documents.$,
      getSelectedPropertyId: documents.getSelectedPropertyId,
      getWorkspaceOwnerId: documents.getWorkspaceOwnerId,
      getDocuments: documents.getDocuments,
      toast: documents.toast,
      fetchAll: documents.fetchAll,
      openPropertyDetails: details.openPropertyDetails,
      repository: documents.documentRepository,
      refreshWorkspace: documents.refreshWorkspace,
      confirm: documents.confirm,
      openWindow: documents.openWindow,
      makeId: documents.makeId,
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
