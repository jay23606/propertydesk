/* Build scoped property detail contexts for content and its actions. */
(() => {
  "use strict";

  function createPropertyDetailContexts({ records, ui, services, workflows }) {
    return Object.freeze({
      content: {
        $: ui.$,
        beginAuditRequest: records.beginAuditRequest,
        setSelectedPropertyId: records.setSelectedPropertyId,
        getPayments: records.getPayments,
        getExpenses: records.getExpenses,
        getProperties: records.getProperties,
        getAccounts: records.getAccounts,
        getDocuments: records.getDocuments,
        getWorkspaceMembers: records.getWorkspaceMembers,
        getPropertyHolders: records.getPropertyHolders,
        isPosted: ui.isPosted,
        sumIncome: ui.sumIncome,
        sumOperatingExpenses: ui.sumOperatingExpenses,
        money: ui.money,
        fmtDate: ui.fmtDate,
        esc: ui.esc,
        prettyType: ui.prettyType,
        paymentFrequencyLabel: ui.paymentFrequencyLabel,
        accountBalance: ui.accountBalance,
        openModal: ui.openModal,
        propertyAddress: ui.propertyAddress,
      },
      management: {
        $: ui.$,
        getSelectedPropertyId: records.getSelectedPropertyId,
        getProperties: records.getProperties,
        getWorkspaceOwnerId: records.getWorkspaceOwnerId,
        getAccounts: records.getAccounts,
        toast: ui.toast,
        fetchAll: services.fetchAll,
        todayIso: ui.todayIso,
        propertyRepository: {
          updateOwned: services.propertyRepository.updateOwned,
        },
        saveAndRefreshWorkspaceRecord: services.saveAndRefreshWorkspaceRecord,
        closeModal: services.closeModal,
        editAccount: services.editAccount,
        openAccountDetails: services.openAccountDetails,
        openPayment: services.openPayment,
        openExpense: services.openExpense,
        openAccountForProperty: services.openAccountForProperty,
      },
      holders: {
        $: ui.$,
        getSelectedPropertyId: records.getSelectedPropertyId,
        getWorkspaceOwnerId: records.getWorkspaceOwnerId,
        getPropertyHolders: records.getPropertyHolders,
        toast: ui.toast,
        fetchAll: services.fetchAll,
        repository: {
          clearPropertyHolders:
            services.propertyHolderRepository.clearPropertyHolders,
          addPropertyHolders:
            services.propertyHolderRepository.addPropertyHolders,
        },
        reconcileWorkspaceChange: services.reconcileWorkspaceChange,
        refreshWorkspace: services.refreshWorkspace,
      },
      documents: {
        workflow: workflows.documentWorkflow,
        documentsWorkflow: workflows.documents,
        documentEventsWorkflow: workflows.documentEvents,
        $: ui.$,
        getSelectedPropertyId: records.getSelectedPropertyId,
        getWorkspaceOwnerId: records.getWorkspaceOwnerId,
        getDocuments: records.getDocuments,
        toast: ui.toast,
        fetchAll: services.fetchAll,
        confirm: ui.confirmAction,
        openWindow: ui.openWindow,
        makeId: ui.makeId,
        documentRepository: services.documentRepository,
        refreshWorkspace: services.refreshWorkspace,
        modules: workflows.documentModules,
      },
      workflows: {
        screen: workflows.screen,
        content: workflows.content,
        management: workflows.management,
        holders: workflows.holder,
        contentModules: workflows.contentModules,
        managementModules: workflows.managementModules,
        holderModules: workflows.holderModules,
      },
    });
  }

  window.PropertyDeskPropertyDetailContextSetup = Object.freeze({
    create: createPropertyDetailContexts,
  });
})();
