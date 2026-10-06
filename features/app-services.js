/* Initialize backend, shared state, and workspace services. */
(() => {
  "use strict";

  function create({
    render,
    toast,
    config = window.PROPERTYDESK_CONFIG || {},
    supabase = window.supabase,
  }) {
    const workspaceData = window.PropertyDeskWorkspaceData.create();
    const backend = window.PropertyDeskBackendClient.create({
      config,
      supabase,
    });
    const state = window.PropertyDeskAppState.create();
    const { fetchAll } = window.PropertyDeskWorkspaceRefresh.create({
      state,
      workspaceData,
      toast,
      render,
    });
    return { backend, state, fetchAll };
  }

  window.PropertyDeskAppServices = Object.freeze({ create });
})();
