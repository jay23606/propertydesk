/* Compose reminder tools, workspace settings, and page navigation. */
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
    const workspace = window.PropertyDeskWorkspace.create({
      $: navigation.$,
      state: navigation.state,
      esc: navigation.esc,
      toast: navigation.toast,
      fetchAll: navigation.fetchAll,
      renderReminderActivity,
      memberRepository: navigation.memberRepository,
      authClient: navigation.authClient,
      confirmAction: navigation.confirmAction,
    });
    const pageNavigation = window.PropertyDeskNavigation.create({
      $: navigation.$,
      state: navigation.state,
      renderWorkspacePage: workspace.renderWorkspacePage,
      documentRef: navigation.documentRef,
      windowRef: navigation.windowRef,
    });

    return {
      previewReminderEmail,
      updateGreeting: workspace.updateGreeting,
      attachProfileEvents: workspace.attachProfileEvents,
      attachWorkspaceMemberEvents: workspace.attachWorkspaceMemberEvents,
      navigate: pageNavigation.navigate,
      attachNavigationEvents: pageNavigation.attachEvents,
    };
  }

  window.PropertyDeskWorkspaceShellWorkflow = Object.freeze({
    create: createWorkspaceShellWorkflow,
  });
})();
