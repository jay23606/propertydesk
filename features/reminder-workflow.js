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
    const reminderActivityModel =
      window.PropertyDeskReminderActivityModel.create({ state });
    const { renderReminderActivity } =
      window.PropertyDeskReminderActivityView.create({
        $,
        esc,
        fmtDate,
        money,
        model: reminderActivityModel,
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
