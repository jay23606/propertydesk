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
    const { savePropertyHolders } =
      window.PropertyDeskPropertyHolderManagement.create({
        state: holders.state,
        toast: holders.toast,
        fetchAll: holders.fetchAll,
        repository: holders.repository,
        openPropertyDetails: details.openPropertyDetails,
      });
    const { attachPropertyHolderEvents } =
      window.PropertyDeskPropertyHolderEvents.create({
        $: holders.$,
        savePropertyHolders,
      });
    const propertyDocuments = window.PropertyDeskDocuments.create({
      state: documents.state,
      toast: documents.toast,
      fetchAll: documents.fetchAll,
      openPropertyDetails: details.openPropertyDetails,
      repository: documents.documentRepository,
    });
    const { attachPropertyDocumentEvents } =
      window.PropertyDeskPropertyDetailDocumentEvents.create({
        $: documents.$,
        uploadPropertyDocument: propertyDocuments.uploadPropertyDocument,
        deletePropertyDocument: propertyDocuments.deletePropertyDocument,
        openPropertyDocument: propertyDocuments.openPropertyDocument,
      });

    return {
      openPropertyDetails: details.openPropertyDetails,
      attachPropertyDetailEvents: actions.attachPropertyDetailEvents,
      attachPropertyQuickActionEvents: actions.attachPropertyQuickActionEvents,
      attachPropertyHolderEvents,
      attachPropertyDocumentEvents,
    };
  }

  window.PropertyDeskPropertyScreenWorkflow = Object.freeze({
    create: createPropertyScreenWorkflow,
  });
})();
