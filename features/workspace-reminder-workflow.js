/* Compose reminder activity and its recipient-facing email preview. */
(() => {
  "use strict";

  function createWorkspaceReminderWorkflow(reminder) {
    const activityModel = window.PropertyDeskReminderActivityModel.create({
      state: reminder.state,
    });
    const { renderReminderActivity } =
      window.PropertyDeskReminderActivityView.create({
        $: reminder.$,
        esc: reminder.esc,
        fmtDate: reminder.fmtDate,
        money: reminder.money,
        model: activityModel,
      });
    const previewModel = window.PropertyDeskReminderPreviewModel.create({
      amountDueSince: reminder.amountDueSince,
      unpaidDueAccrualStart: reminder.unpaidDueAccrualStart,
      monthEnd: reminder.monthEnd,
      dateOnly: reminder.dateOnly,
      monthStart: reminder.monthStart,
      propertyAddress: reminder.propertyAddress,
      money: reminder.money,
    });
    const { previewReminderEmail } = window.PropertyDeskReminderPreview.create({
      $: reminder.$,
      state: reminder.state,
      todayIso: reminder.todayIso,
      moneyInput: reminder.moneyInput,
      toast: reminder.toast,
      esc: reminder.esc,
      model: previewModel,
      openModal: reminder.openModal,
    });

    return { renderReminderActivity, previewReminderEmail };
  }

  window.PropertyDeskWorkspaceReminderWorkflow = Object.freeze({
    create: createWorkspaceReminderWorkflow,
  });
})();
