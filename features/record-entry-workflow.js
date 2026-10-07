/* Compose property/account record forms with payment/expense forms. */
(() => {
  "use strict";

  function create(context) {
    const {
      $,
      state,
      moneyInput,
      todayIso,
      toast,
      closeModal,
      fetchAll,
      populateFormOptions,
      openModal,
      previewReminderEmail,
      saveCorrection,
      propertyRepository,
      accountRepository,
      accountPayload,
      accountFormModel,
      transactionRepository,
      transactionPayloads,
    } = context;
    const propertyAccountEntry =
      window.PropertyDeskPropertyAccountEntryWorkflow.create({
        $,
        state,
        moneyInput,
        todayIso,
        toast,
        closeModal,
        fetchAll,
        populateFormOptions,
        openModal,
        previewReminderEmail,
        propertyRepository,
        accountRepository,
        accountPayload,
        accountFormModel,
      });
    const ledgerEntry = window.PropertyDeskLedgerEntryWorkflow.create({
      $,
      state,
      moneyInput,
      todayIso,
      toast,
      closeModal,
      fetchAll,
      fillSelect: context.fillSelect,
      populateFormOptions,
      prettyType: context.prettyType,
      openModal,
      saveCorrection,
      transactionRepository,
      transactionPayloads,
    });
    return {
      ...propertyAccountEntry,
      ...ledgerEntry,
    };
  }

  window.PropertyDeskRecordEntryWorkflow = Object.freeze({ create });
})();
