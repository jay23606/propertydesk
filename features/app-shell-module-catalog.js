/* Collect workspace settings and navigation modules for the app shell. */
(() => {
  "use strict";

  function createAppShellModuleCatalog() {
    return Object.freeze({
      shell: window.PropertyDeskAppShellWorkflow,
      workspace: window.PropertyDeskWorkspace,
      navigation: window.PropertyDeskNavigation,
      workspaceModules: {
        profile: window.PropertyDeskWorkspaceProfileWorkflow,
        memberView: window.PropertyDeskWorkspaceMembersView,
        memberMaintenance: window.PropertyDeskWorkspaceMemberMaintenance,
        members: window.PropertyDeskWorkspaceMembers,
        reminderActivityData: window.PropertyDeskWorkspaceReminderActivityData,
        profileModules: {
          display: window.PropertyDeskProfileDisplay,
          view: window.PropertyDeskProfileSettingsView,
          settings: window.PropertyDeskProfileSettings,
        },
      },
    });
  }

  window.PropertyDeskAppShellModuleCatalog = Object.freeze({
    create: createAppShellModuleCatalog,
  });
})();
