/* Compose the Workspace reminder delivery activity view. */
(() => {
  "use strict";

  function createWorkspaceReminderWorkflow({
    $,
    state,
    esc,
    fmtDate,
    money,
    activityModelWorkflow,
    activityViewWorkflow,
  }) {
    const activityModel = activityModelWorkflow.create({
      state,
    });
    const { renderReminderActivity } = activityViewWorkflow.create({
      $,
      esc,
      fmtDate,
      money,
      model: activityModel,
    });
    return Object.freeze({ renderReminderActivity });
  }

  window.PropertyDeskWorkspaceReminderWorkflow = Object.freeze({
    create: createWorkspaceReminderWorkflow,
  });
})();
