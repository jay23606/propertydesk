/* Wire workspace settings and navigation with scoped app-shell inputs. */
(() => {
  "use strict";

  function createAppShellSetup({ records, ui, services, workflows }) {
    return workflows.shell.create({
      workspaceWorkflow: workflows.workspace,
      navigationWorkflow: workflows.navigation,
      workspaceWorkflows: workflows.workspaceModules,
      workspace: {
        $: ui.$,
        getAccounts: records.getAccounts,
        getProperties: records.getProperties,
        getReminderLogs: records.getReminderLogs,
        getUser: records.getUser,
        setUser: records.setUser,
        getWorkspaceMembers: records.getWorkspaceMembers,
        getWorkspaceOwnerId: records.getWorkspaceOwnerId,
        now: ui.now,
        esc: ui.esc,
        toast: ui.toast,
        fetchAll: services.fetchAll,
        reminder: ui.reminder,
        memberRepository: services.memberRepository,
        run: services.run,
        runAndRefreshWorkspaceChange: services.runAndRefreshWorkspaceChange,
        authClient: services.authClient,
        confirmAction: ui.confirmAction,
      },
      navigation: {
        $: ui.$,
        setView: records.setView,
        documentRef: ui.documentRef,
        windowRef: ui.windowRef,
      },
    });
  }

  window.PropertyDeskAppShellSetup = Object.freeze({
    create: createAppShellSetup,
  });
})();
