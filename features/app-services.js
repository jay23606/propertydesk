/* Initialize backend, shared state, notifications, and workspace services. */
(() => {
  "use strict";

  function create({
    $,
    render,
    config = window.PROPERTYDESK_CONFIG || {},
    supabase = window.supabase,
  }) {
    const workspaceData = window.PropertyDeskWorkspaceData.create();
    const backend = window.PropertyDeskBackendClient.create({
      config,
      supabase,
    });
    const state = window.PropertyDeskAppState.create();
    const { toast } = window.PropertyDeskNotifications.create({ $ });
    const { fetchAll } = window.PropertyDeskWorkspaceRefresh.create({
      state,
      workspaceData,
      toast,
      render,
    });
    return {
      backend,
      state,
      toast,
      fetchAll,
    };
  }

  window.PropertyDeskAppServices = Object.freeze({ create });
})();
