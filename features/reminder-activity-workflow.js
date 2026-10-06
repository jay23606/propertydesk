/* Compose reminder-delivery history data with its display view. */
(() => {
  "use strict";

  function create({ $, state, esc, fmtDate, money }) {
    const model = window.PropertyDeskReminderActivityModel.create({ state });
    const { renderReminderActivity } =
      window.PropertyDeskReminderActivityView.create({
        $,
        esc,
        fmtDate,
        money,
        model,
      });

    return { renderReminderActivity };
  }

  window.PropertyDeskReminderActivityWorkflow = Object.freeze({ create });
})();
