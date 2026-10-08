/* Compose workspace settings and page navigation for the app shell. */
(() => {
  "use strict";

  function createAppShellWorkflow({ workspace, navigation }) {
    const workspacePage = window.PropertyDeskWorkspace.create({
      $: workspace.$,
      state: workspace.state,
      esc: workspace.esc,
      toast: workspace.toast,
      fetchAll: workspace.fetchAll,
      reminder: workspace.reminder,
      memberRepository: workspace.memberRepository,
      authClient: workspace.authClient,
      confirmAction: workspace.confirmAction,
    });
    const pageNavigation = window.PropertyDeskNavigation.create({
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
