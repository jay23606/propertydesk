/* Compose private property-document actions with their detail event binder. */
(() => {
  "use strict";

  function createPropertyDocumentManagementWorkflow(context) {
    const propertyDocuments = window.PropertyDeskDocuments.create({
      state: context.state,
      toast: context.toast,
      fetchAll: context.fetchAll,
      openPropertyDetails: context.openPropertyDetails,
      repository: context.documentRepository,
    });
    const { attachPropertyDocumentEvents } =
      window.PropertyDeskPropertyDetailDocumentEvents.create({
        $: context.$,
        uploadPropertyDocument: propertyDocuments.uploadPropertyDocument,
        deletePropertyDocument: propertyDocuments.deletePropertyDocument,
        openPropertyDocument: propertyDocuments.openPropertyDocument,
      });

    return { attachPropertyDocumentEvents };
  }

  window.PropertyDeskPropertyDocumentManagementWorkflow = Object.freeze({
    create: createPropertyDocumentManagementWorkflow,
  });
})();
