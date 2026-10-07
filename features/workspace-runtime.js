/* Create shared backend, state, and workspace refresh services. */
(() => {
  "use strict";

  function createWorkspaceRuntime({ config, supabase, toast, render }) {
    const backend = window.PropertyDeskBackendClient.create({
      config,
      supabase,
    });
    const state = window.PropertyDeskAppState.create();
    const { fetchAll } = window.PropertyDeskWorkspaceRefresh.create({
      state,
      workspaceData: window.PropertyDeskWorkspaceData.create(),
      toast,
      render,
    });

    return { backend, state, fetchAll };
  }

  window.PropertyDeskWorkspaceRuntime = Object.freeze({
    create: createWorkspaceRuntime,
  });
})();
