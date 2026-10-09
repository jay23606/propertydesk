/* Create shared backend, state, and workspace refresh services. */
(() => {
  "use strict";

  function createWorkspaceRuntime({
    config,
    supabase,
    repositories,
    toast,
    reportError,
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
      queryUtils: repositories.queryUtils,
    });
    const workspaceQuery = workflows.query.create({
      getClient,
    });
    const workspaceReads = workflows.readCatalog.create(tables);
    const workspaceData = workflows.data.create({
      reads: workspaceReads,
      workspaceQuery,
    });
    const workspaceRefresh = workflows.refresh.create({
      getUserId: () => state.user?.id,
      setWorkspaceRecords: (records) => Object.assign(state, records),
      setWorkspaceOwnerId: (workspaceOwnerId) => {
        state.workspaceOwnerId = workspaceOwnerId;
      },
      workspaceData,
      toast,
      reportError,
    });

    return Object.freeze({
      backendConfigured: backend.configured,
      state,
      fetchAll: workspaceRefresh.fetchAll,
      setRender: workspaceRefresh.setRender,
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
