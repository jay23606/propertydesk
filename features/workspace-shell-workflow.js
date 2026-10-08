/* Connect reminder tools with workspace settings and navigation. */
(() => {
  "use strict";

  function createWorkspaceShellWorkflow({ reminder, navigation }) {
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
    const workspace = window.PropertyDeskWorkspaceNavigationWorkflow.create({
      $: navigation.$,
      state: navigation.state,
      esc: navigation.esc,
      toast: navigation.toast,
      fetchAll: navigation.fetchAll,
      renderReminderActivity,
      documentRef: navigation.documentRef,
      windowRef: navigation.windowRef,
      memberRepository: navigation.memberRepository,
      authClient: navigation.authClient,
      confirmAction: navigation.confirmAction,
    });

    return {
      previewReminderEmail,
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
