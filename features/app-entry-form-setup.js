/* Compose shared modal, select-option, and reminder-preview form support. */
(() => {
  "use strict";

  function createAppEntryFormSetup({ records, ui, services, modules }) {
    const modal = modules.modal.create({
      $: ui.$,
      setPendingImport: records.modal.setPendingImport,
      setPendingCorrection: records.modal.setPendingCorrection,
      advanceAuditRequestId: records.modal.advanceAuditRequestId,
      documentRef: ui.documentRef,
    });
    const formOptions = modules.formOptions.create({
      $: ui.$,
      getProperties: records.formOptions.getProperties,
      getAccounts: records.formOptions.getAccounts,
      esc: ui.esc,
      propertyAddress: ui.propertyAddress,
      prettyType: ui.prettyType,
      modules: modules.formOptionModules,
    });
    const { previewReminderEmail } = modules.reminderPreviewSetup.create({
      records: records.reminderPreview,
      ui: {
        $: ui.$,
        monthEnd: ui.monthEnd,
        dateOnly: ui.dateOnly,
        monthStart: ui.monthStart,
        propertyAddress: ui.propertyAddress,
        money: ui.money,
        todayIso: ui.todayIso,
        moneyInput: ui.moneyInput,
        toast: ui.toast,
        esc: ui.esc,
        openModal: modal.openModal,
      },
      services: {
        paymentReminderMessage: services.paymentReminderMessage,
        amountDueSince: services.amountDueSince,
        unpaidDueAccrualStart: services.unpaidDueAccrualStart,
        splitEmailAddresses: services.splitEmailAddresses,
      },
      workflows: modules.reminderPreview,
    });

    return Object.freeze({
      attachModalEvents: modal.attachEvents,
      closeModal: modal.closeModal,
      fillSelect: formOptions.fillSelect,
      openModal: modal.openModal,
      populateFormOptions: formOptions.populateFormOptions,
      previewReminderEmail,
    });
  }

  window.PropertyDeskAppEntryFormSetup = Object.freeze({
    create: createAppEntryFormSetup,
  });
})();
