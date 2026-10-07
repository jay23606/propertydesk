/* Create shared backend, state, and workspace refresh services. */
(() => {
  "use strict";

  function createWorkspaceRuntime({
    config,
    supabase,
    repositories,
    toast,
    render,
  }) {
    const backend = window.PropertyDeskBackendClient.create({
      config,
      supabase,
    });
    const state = window.PropertyDeskAppState.create();
    let client = null;
    const getClient = () => client;
    const initializeClient = () => {
      client = backend.createClient();
      return client;
    };
    const authClient = window.PropertyDeskAuthClient.create({
      getClient,
    });
    const repositoryAdapters = window.PropertyDeskRepositoryRegistry.create({
      repositories,
      getClient,
    });
    const workspaceQuery = window.PropertyDeskWorkspaceQuery.create({
      getClient,
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

    return {
      backend,
      state,
      fetchAll,
      workspaceQuery,
      authClient,
      repositories: repositoryAdapters,
      getClient,
      initializeClient,
      isClientReady: () => Boolean(client),
    };
  }

  window.PropertyDeskWorkspaceRuntime = Object.freeze({
    create: createWorkspaceRuntime,
  });
})();
