/* Compose workspace settings, reminder activity, and email preview features. */
(() => {
  "use strict";

  function create(context) {
    const {
      $, state, esc, fmtDate, money, toast, fetchAll, updateGreeting,
      amountDueSince, unpaidDueAccrualStart, todayIso, monthEnd, moneyInput,
      dateOnly, monthStart, propertyAddress, openModal,
    } = context;
    const { renderReminderActivity } = window.PropertyDeskReminderActivityView.create({
      $, state, esc, fmtDate, money,
    });
    const {
      renderWorkspaceSettings,
      attachEvents: attachWorkspaceEvents,
    } = window.PropertyDeskWorkspace.create({
      $, state, esc, toast, fetchAll, updateGreeting, renderReminderActivity,
    });
    const { previewReminderEmail } = window.PropertyDeskReminderPreview.create({
      $, state, amountDueSince, unpaidDueAccrualStart, todayIso, monthEnd,
      moneyInput, toast, dateOnly, monthStart, propertyAddress, money, esc,
      openModal,
    });

    return {
      renderWorkspaceSettings,
      attachWorkspaceEvents,
      previewReminderEmail,
    };
  }

  window.PropertyDeskWorkspaceSettingsWorkflow = Object.freeze({ create });
})();
