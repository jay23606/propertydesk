/* Compose Workspace settings rendering with page navigation. */
(() => {
  "use strict";

  function createWorkspaceNavigationWorkflow(context) {
    const {
      $,
      state,
      esc,
      toast,
      fetchAll,
      renderReminderActivity,
      memberRepository,
      documentRef,
      windowRef,
      confirmAction,
    } = context;
    const workspace = window.PropertyDeskWorkspace.create({
      $,
      state,
      esc,
      toast,
      fetchAll,
      renderReminderActivity,
      memberRepository,
      confirmAction,
    });
    const navigation = window.PropertyDeskNavigation.create({
      $,
      state,
      renderWorkspaceSettings: workspace.renderWorkspaceSettings,
      documentRef,
      windowRef,
    });

    return {
      updateGreeting: workspace.updateGreeting,
      attachProfileEvents: workspace.attachProfileEvents,
      attachWorkspaceMemberEvents: workspace.attachWorkspaceMemberEvents,
      navigate: navigation.navigate,
      attachNavigationEvents: navigation.attachEvents,
    };
  }

  window.PropertyDeskWorkspaceNavigationWorkflow = Object.freeze({
    create: createWorkspaceNavigationWorkflow,
  });
})();
