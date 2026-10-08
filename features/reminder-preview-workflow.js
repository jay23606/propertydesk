/* Compose the account editor's buyer and tenant reminder preview. */
(() => {
  "use strict";

  function create({
    $,
    state,
    paymentReminderMessage,
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
    splitEmailAddresses,
    workflows,
  }) {
    const model = workflows.model.create({
      paymentReminderMessage,
      amountDueSince,
      unpaidDueAccrualStart,
      monthEnd,
      dateOnly,
      monthStart,
      propertyAddress,
      money,
    });
    const { previewReminderEmail } = workflows.preview.create({
      $,
      state,
      todayIso,
      moneyInput,
      toast,
      esc,
      splitEmailAddresses,
      model,
      openModal,
    });

    return Object.freeze({ previewReminderEmail });
  }

  window.PropertyDeskReminderPreviewWorkflow = Object.freeze({ create });
})();
