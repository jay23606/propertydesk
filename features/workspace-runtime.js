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
    const workspaceReads = window.PropertyDeskWorkspaceReadCatalog.create(
      window.PropertyDeskWorkspaceTables,
    );
    const workspaceData = window.PropertyDeskWorkspaceData.create({
      reads: workspaceReads,
      workspaceQuery,
    });
    const { fetchAll } = window.PropertyDeskWorkspaceRefresh.create({
      state,
      workspaceData,
      toast,
      render,
    });

    return Object.freeze({
      backendConfigured: backend.configured,
      state,
      fetchAll,
      loadAllWorkspacePages: workspaceQuery.loadAllPages,
      authClient,
      repositories: repositoryAdapters,
      initializeClient,
      isClientReady: () => Boolean(client),
    });
  }

  window.PropertyDeskWorkspaceRuntime = Object.freeze({
    create: createWorkspaceRuntime,
  });
})();
