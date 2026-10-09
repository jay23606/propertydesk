/* Compose workspace settings and page navigation for the app shell. */
(() => {
  "use strict";

  function createAppShellWorkflow({
    workspace,
    navigation,
    workspaceWorkflow,
    navigationWorkflow,
    workspaceWorkflows,
  }) {
    const workspacePage = workspaceWorkflow.create({
      $: workspace.$,
      getAccounts: workspace.getAccounts,
      getProperties: workspace.getProperties,
      getReminderLogs: workspace.getReminderLogs,
      getUser: workspace.getUser,
      setUser: workspace.setUser,
      getWorkspaceMembers: workspace.getWorkspaceMembers,
      getWorkspaceOwnerId: workspace.getWorkspaceOwnerId,
      now: workspace.now,
      esc: workspace.esc,
      toast: workspace.toast,
      fetchAll: workspace.fetchAll,
      reminder: workspace.reminder,
      memberRepository: workspace.memberRepository,
      authClient: workspace.authClient,
      run: workspace.run,
      runAndRefreshWorkspaceChange: workspace.runAndRefreshWorkspaceChange,
      confirmAction: workspace.confirmAction,
      workflows: workspaceWorkflows,
    });
    const pageNavigation = navigationWorkflow.create({
      $: navigation.$,
      setView: navigation.setView,
      documentRef: navigation.documentRef,
      windowRef: navigation.windowRef,
      renderWorkspacePage: workspacePage.renderWorkspacePage,
    });

    return Object.freeze({
      updateGreeting: workspacePage.updateGreeting,
      attachProfileEvents: workspacePage.attachProfileEvents,
      attachWorkspaceMemberEvents: workspacePage.attachWorkspaceMemberEvents,
      navigate: pageNavigation.navigate,
      attachNavigationEvents: pageNavigation.attachEvents,
    });
  }

  window.PropertyDeskAppShellWorkflow = Object.freeze({
    create: createAppShellWorkflow,
  });
})();
