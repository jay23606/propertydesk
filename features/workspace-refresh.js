/* Resolve the active workspace, hydrate its rows, then refresh every view. */
(() => {
  "use strict";

  function create({ state, workspaceData, toast, render }) {
    let latestFetchId = 0;

    function isCurrentFetch(fetchId, userId) {
      return fetchId === latestFetchId && state.user?.id === userId;
    }

    async function resolveWorkspaceId(fetchId, userId) {
      const { data: workspaceId, error: workspaceError } =
        await workspaceData.loadWorkspaceId();
      if (!isCurrentFetch(fetchId, userId)) return null;
      if (workspaceError || !workspaceId) {
        const error = workspaceError || new Error("Missing workspace");
        toast(workspaceError?.message || "Could not load this workspace");
        throw error;
      }
      return workspaceId;
    }

    async function hydrateWorkspace(workspaceId, fetchId, userId) {
      try {
        const records = await workspaceData.loadWorkspaceRecords(workspaceId);
        if (!isCurrentFetch(fetchId, userId)) return false;
        Object.assign(state, records);
        state.workspaceOwnerId = workspaceId;
        return true;
      } catch (error) {
        if (!isCurrentFetch(fetchId, userId)) return false;
        toast(error?.message || "Could not load this workspace");
        throw error;
      }
    }

    function renderWorkspace(fetchId, userId) {
      if (!isCurrentFetch(fetchId, userId)) return;
      try {
        render();
      } catch (error) {
        window.console?.error(
          "PropertyDesk failed to render workspace data.",
          error,
        );
        toast(
          "Workspace data loaded but could not be displayed. Reload and try again.",
        );
        throw error;
      }
    }

    async function fetchAll() {
      const fetchId = ++latestFetchId;
      const userId = state.user?.id;
      const workspaceId = await resolveWorkspaceId(fetchId, userId);
      if (!workspaceId || !isCurrentFetch(fetchId, userId)) return;
      if (!(await hydrateWorkspace(workspaceId, fetchId, userId))) return;
      renderWorkspace(fetchId, userId);
    }

    return Object.freeze({ fetchAll });
  }

  window.PropertyDeskWorkspaceRefresh = Object.freeze({ create });
})();
