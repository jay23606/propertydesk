/* Compose property detail content with its management and document actions. */
(() => {
  "use strict";

  function createPropertyScreenWorkflow({
    content,
    management,
    holders,
    documents,
  }) {
    const details = window.PropertyDeskPropertyDetailContentWorkflow.create({
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
    });
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
      $: holders.$,
      state: holders.state,
      toast: holders.toast,
      fetchAll: holders.fetchAll,
      repository: holders.repository,
      openPropertyDetails: details.openPropertyDetails,
    });
    const propertyDocuments =
      window.PropertyDeskPropertyDocumentManagementWorkflow.create({
        $: documents.$,
        state: documents.state,
        toast: documents.toast,
        fetchAll: documents.fetchAll,
        documentRepository: documents.documentRepository,
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
