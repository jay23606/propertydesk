/* Connect reminder tools with workspace settings and navigation. */
(() => {
  "use strict";

  function createWorkspaceShellWorkflow({ reminder, navigation }) {
    const reminders = window.PropertyDeskWorkspaceReminderWorkflow.create({
      $: reminder.$,
      state: reminder.state,
      esc: reminder.esc,
      fmtDate: reminder.fmtDate,
      money: reminder.money,
      amountDueSince: reminder.amountDueSince,
      unpaidDueAccrualStart: reminder.unpaidDueAccrualStart,
      monthEnd: reminder.monthEnd,
      dateOnly: reminder.dateOnly,
      monthStart: reminder.monthStart,
      propertyAddress: reminder.propertyAddress,
      todayIso: reminder.todayIso,
      moneyInput: reminder.moneyInput,
      toast: reminder.toast,
      openModal: reminder.openModal,
    });
    const workspace = window.PropertyDeskWorkspaceNavigationWorkflow.create({
      $: navigation.$,
      state: navigation.state,
      esc: navigation.esc,
      toast: navigation.toast,
      fetchAll: navigation.fetchAll,
      renderReminderActivity: reminders.renderReminderActivity,
      documentRef: navigation.documentRef,
      windowRef: navigation.windowRef,
      memberRepository: navigation.memberRepository,
      authClient: navigation.authClient,
      confirmAction: navigation.confirmAction,
    });

    return {
      previewReminderEmail: reminders.previewReminderEmail,
      updateGreeting: workspace.updateGreeting,
      attachProfileEvents: workspace.attachProfileEvents,
      attachWorkspaceMemberEvents: workspace.attachWorkspaceMemberEvents,
      navigate: workspace.navigate,
      attachNavigationEvents: workspace.attachNavigationEvents,
    };
  }

  window.PropertyDeskWorkspaceShellWorkflow = Object.freeze({
    create: createWorkspaceShellWorkflow,
  });
})();
