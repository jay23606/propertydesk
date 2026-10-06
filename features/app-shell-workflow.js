/* Compose workspace settings, reminders, navigation, and app theme controls. */
(() => {
  "use strict";

  function create(context) {
    const {
      $,
      state,
      esc,
      toast,
      fetchAll,
      updateGreeting,
      fmtDate,
      money,
      amountDueSince,
      unpaidDueAccrualStart,
      todayIso,
      monthEnd,
      moneyInput,
      dateOnly,
      monthStart,
      propertyAddress,
      openModal,
    } = context;
    const reminders = window.PropertyDeskReminderWorkflow.create({
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
    });
    const settings = window.PropertyDeskWorkspace.create({
      $,
      state,
      esc,
      toast,
      fetchAll,
      updateGreeting,
      renderReminderActivity: reminders.renderReminderActivity,
    });
    const navigation = window.PropertyDeskNavigation.create({
      $,
      state,
      renderWorkspaceSettings: settings.renderWorkspaceSettings,
    });
    const theme = window.PropertyDeskTheme.create();

    function attachEvents() {
      theme.attachEvents();
      navigation.attachEvents();
      settings.attachEvents();
    }

    return {
      navigate: navigation.navigate,
      previewReminderEmail: reminders.previewReminderEmail,
      attachEvents,
    };
  }

  window.PropertyDeskAppShellWorkflow = Object.freeze({ create });
})();
