/* Create shared backend, state, and workspace refresh services. */
(() => {
  "use strict";

  function createWorkspaceRuntime({
    config,
    supabase,
    repositories,
    toast,
    render,
    tables,
    workflows,
  }) {
    const backend = workflows.backendClient.create({
      config,
      supabase,
    });
    const state = workflows.appState.create();
    let client = null;
    const getClient = () => client;
    const initializeClient = () => {
      client = backend.createClient();
      return client;
    };
    const authClient = workflows.authClient.create({
      getClient,
    });
    const repositoryAdapters = workflows.repositoryRegistry.create({
      repositories,
      getClient,
    });
    const workspaceQuery = workflows.query.create({
      getClient,
    });
    const workspaceReads = workflows.readCatalog.create(tables);
    const workspaceData = workflows.data.create({
      reads: workspaceReads,
      workspaceQuery,
    });
    const { fetchAll } = workflows.refresh.create({
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
      getClient,
      isClientReady: () => Boolean(client),
    });
  }

  window.PropertyDeskWorkspaceRuntime = Object.freeze({
    create: createWorkspaceRuntime,
  });
})();
