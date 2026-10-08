/* Compose the Workspace reminder delivery activity view. */
(() => {
  "use strict";

  function createWorkspaceReminderWorkflow({ $, state, esc, fmtDate, money }) {
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
    return Object.freeze({ renderReminderActivity });
  }

  window.PropertyDeskWorkspaceReminderWorkflow = Object.freeze({
    create: createWorkspaceReminderWorkflow,
  });
})();
