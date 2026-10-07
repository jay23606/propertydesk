/* Compose property detail content with its management and document actions. */
(() => {
  "use strict";

  function createPropertyScreenWorkflow({
    content,
    management,
    holders,
    documents,
  }) {
    const details =
      window.PropertyDeskPropertyDetailContentWorkflow.create(content);
    const actions = window.PropertyDeskPropertyDetailManagementWorkflow.create({
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
    });
    const propertyHolders = window.PropertyDeskPropertyHolderWorkflow.create({
      ...holders,
      openPropertyDetails: details.openPropertyDetails,
    });
    const propertyDocuments =
      window.PropertyDeskPropertyDocumentManagementWorkflow.create({
        ...documents,
        openPropertyDetails: details.openPropertyDetails,
      });

    return {
      openPropertyDetails: details.openPropertyDetails,
      attachPropertyDetailEvents: actions.attachPropertyDetailEvents,
      attachPropertyQuickActionEvents: actions.attachPropertyQuickActionEvents,
      attachPropertyHolderEvents: propertyHolders.attachPropertyHolderEvents,
      attachPropertyDocumentEvents:
        propertyDocuments.attachPropertyDocumentEvents,
    };
  }

  window.PropertyDeskPropertyScreenWorkflow = Object.freeze({
    create: createPropertyScreenWorkflow,
  });
})();
