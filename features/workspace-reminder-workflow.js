/* Compose reminder activity and its recipient-facing email preview. */
(() => {
  "use strict";

  function createWorkspaceReminderWorkflow({
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
  }) {
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
