/* Compose reminder activity display and email preview for the workspace. */
(() => {
  "use strict";

  function createWorkspaceReminderWorkflow(context) {
    const {
      $,
      state,
      esc,
      fmtDate,
      money,
      amountDueSince,
      unpaidDueAccrualStart,
      monthEnd,
      dateOnly,
      monthStart,
      propertyAddress,
      todayIso,
      moneyInput,
      toast,
      openModal,
    } = context;
    const activityModel = window.PropertyDeskReminderActivityModel.create({
      state,
    });
    const { renderReminderActivity } =
      window.PropertyDeskReminderActivityView.create({
        $,
        esc,
        fmtDate,
        money,
        model: activityModel,
      });
    const previewModel = window.PropertyDeskReminderPreviewModel.create({
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
      model: previewModel,
      openModal,
    });

    return { renderReminderActivity, previewReminderEmail };
  }

  window.PropertyDeskWorkspaceReminderWorkflow = Object.freeze({
    create: createWorkspaceReminderWorkflow,
  });
})();
