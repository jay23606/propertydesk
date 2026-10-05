/* Compose reminder delivery history and the on-demand email preview. */
(() => {
  "use strict";

  function create(context) {
    const {
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
      openModal,
    } = context;
    const { renderReminderActivity } =
      window.PropertyDeskReminderActivityView.create({
        $,
        state,
        esc,
        fmtDate,
        money,
      });
    const { previewReminderEmail } = window.PropertyDeskReminderPreview.create({
      $,
      state,
      amountDueSince,
      unpaidDueAccrualStart,
      todayIso,
      monthEnd,
      moneyInput,
      toast,
      dateOnly,
      monthStart,
      propertyAddress,
      money,
      esc,
      openModal,
    });

    return { renderReminderActivity, previewReminderEmail };
  }

  window.PropertyDeskReminderWorkflow = Object.freeze({ create });
})();
