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
      state: workspace.state,
      now: workspace.now,
      esc: workspace.esc,
      toast: workspace.toast,
      fetchAll: workspace.fetchAll,
      reminder: workspace.reminder,
      memberRepository: workspace.memberRepository,
      writeFeedback: workspace.writeFeedback,
      authClient: workspace.authClient,
      confirmAction: workspace.confirmAction,
      workflows: workspaceWorkflows,
    });
    const pageNavigation = navigationWorkflow.create({
      $: navigation.$,
      state: navigation.state,
      renderWorkspacePage: workspacePage.renderWorkspacePage,
      documentRef: navigation.documentRef,
      windowRef: navigation.windowRef,
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
