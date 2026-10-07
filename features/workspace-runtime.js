/* Create shared backend, state, and workspace refresh services. */
(() => {
  "use strict";

  function createWorkspaceRuntime({ config, supabase, toast, render }) {
    const backend = window.PropertyDeskBackendClient.create({
      config,
      supabase,
    });
    const state = window.PropertyDeskAppState.create();
    const authClient = window.PropertyDeskAuthClient.create({
      getClient: () => state.client,
    });
    const workspaceQuery = window.PropertyDeskWorkspaceQuery.create({
      getClient: () => state.client,
    });
    const workspaceData = window.PropertyDeskWorkspaceData.create({
      tables: window.PropertyDeskWorkspaceTables,
      workspaceQuery,
    });
    const { fetchAll } = window.PropertyDeskWorkspaceRefresh.create({
      state,
      workspaceData,
      toast,
      render,
    });

    return { backend, state, fetchAll, workspaceQuery, authClient };
  }

  window.PropertyDeskWorkspaceRuntime = Object.freeze({
    create: createWorkspaceRuntime,
  });
})();
