/* Compose property detail content with property management actions. */
(() => {
  "use strict";

  function createPropertyScreenWorkflow({ content, management }) {
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
      makeId: management.makeId,
      confirm: management.confirm,
      openWindow: management.openWindow,
    });

    return {
      openPropertyDetails: details.openPropertyDetails,
      attachPropertyDetailEvents: actions.attachPropertyDetailEvents,
      attachPropertyQuickActionEvents: actions.attachPropertyQuickActionEvents,
      attachPropertyHolderEvents: actions.attachPropertyHolderEvents,
      attachPropertyDocumentEvents: actions.attachPropertyDocumentEvents,
    };
  }

  window.PropertyDeskPropertyScreenWorkflow = Object.freeze({
    create: createPropertyScreenWorkflow,
  });
})();
