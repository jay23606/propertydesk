/* Compose the Workspace reminder delivery activity view. */
(() => {
  "use strict";

  function createWorkspaceReminderWorkflow({
    $,
    getActivityData,
    esc,
    fmtDate,
    fmtDateTime,
    money,
    activityModelWorkflow,
    activityViewWorkflow,
  }) {
    const activityModel = activityModelWorkflow.create({ getActivityData });
    const { renderReminderActivity } = activityViewWorkflow.create({
      $,
      esc,
      fmtDate,
      fmtDateTime,
      money,
      model: activityModel,
    });
    return Object.freeze({ renderReminderActivity });
  }

  window.PropertyDeskWorkspaceReminderWorkflow = Object.freeze({
    create: createWorkspaceReminderWorkflow,
  });
})();
