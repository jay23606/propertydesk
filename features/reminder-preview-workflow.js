/* Compose the account editor's buyer and tenant reminder preview. */
(() => {
  "use strict";

  function create(context) {
    const {
      $,
      state,
      amountDueSince,
      unpaidDueAccrualStart,
      monthEnd,
      dateOnly,
      monthStart,
      propertyAddress,
      money,
      todayIso,
      moneyInput,
      toast,
      esc,
      openModal,
    } = context;
    const model = window.PropertyDeskReminderPreviewModel.create({
      amountDueSince,
      unpaidDueAccrualStart,
      monthEnd,
      dateOnly,
      monthStart,
      propertyAddress,
      money,
    });
    const { previewReminderEmail } = window.PropertyDeskReminderPreview.create({
      $,
      state,
      todayIso,
      moneyInput,
      toast,
      esc,
      model,
      openModal,
    });

    return Object.freeze({ previewReminderEmail });
  }

  window.PropertyDeskReminderPreviewWorkflow = Object.freeze({ create });
})();
