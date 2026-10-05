/* Resolve the active workspace, hydrate its rows, then refresh every view. */
(() => {
  "use strict";

  function create({ state, workspaceData, toast, render }) {
    async function fetchAll() {
      const { data: workspaceId, error: workspaceError } =
        await state.client.rpc("pd_workspace_id");
      if (workspaceError || !workspaceId) {
        const error = workspaceError || new Error("Missing workspace");
        toast(workspaceError?.message || "Could not load this workspace");
        throw error;
      }

      state.workspaceOwnerId = workspaceId;
      try {
        Object.assign(
          state,
          await workspaceData.loadWorkspaceRecords(state.client, workspaceId),
        );
      } catch (error) {
        toast(error?.message || "Could not load this workspace");
        throw error;
      }
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

    return { fetchAll };
  }

  window.PropertyDeskWorkspaceRefresh = Object.freeze({ create });
})();
