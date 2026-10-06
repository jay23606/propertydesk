/* Connect modal controls, form choices, and reminder preview support. */
(() => {
  "use strict";

  function create(context) {
    const {
      $,
      state,
      esc,
      propertyAddress,
      prettyType,
      documentRef,
      fmtDate,
      money,
      amountDueSince,
      unpaidDueAccrualStart,
      todayIso,
      monthEnd,
      moneyInput,
      toast,
      dateOnly,
      monthStart,
    } = context;
    const modal = window.PropertyDeskModalController.create({
      $,
      state,
      documentRef,
    });
    const formOptions = window.PropertyDeskFormOptions.create({
      $,
      state,
      esc,
      propertyAddress,
      prettyType,
    });
    const reminders = window.PropertyDeskReminderWorkflow.create({
      $,
      state,
      esc,
      fmtDate,
      money,
      amountDueSince,
      unpaidDueAccrualStart,
      todayIso,
      monthEnd,
      moneyInput,
      toast,
      dateOnly,
      monthStart,
      propertyAddress,
      openModal: modal.openModal,
    });

    return {
      attachModalEvents: modal.attachEvents,
      openModal: modal.openModal,
      closeModal: modal.closeModal,
      fillSelect: formOptions.fillSelect,
      populateFormOptions: formOptions.populateFormOptions,
      renderReminderActivity: reminders.renderReminderActivity,
      previewReminderEmail: reminders.previewReminderEmail,
    };
  }

  window.PropertyDeskRecordEntrySupportWorkflow = Object.freeze({ create });
})();
