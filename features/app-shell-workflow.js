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
      ...workspace,
      workflows: workspaceWorkflows,
    });
    const pageNavigation = navigationWorkflow.create({
      ...navigation,
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
