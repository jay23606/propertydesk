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
      ...content,
      workflows: workflows.contentModules,
    });
    const actions = workflows.management.create({
      ...management,
      openPropertyDetails: details.openPropertyDetails,
      workflows: workflows.managementModules,
    });
    const { attachPropertyHolderEvents } = workflows.holders.create({
      ...holders,
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
