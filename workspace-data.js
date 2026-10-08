/* Workspace-scoped reads used to hydrate the PropertyDesk client state. */
(() => {
  "use strict";

  function create({ reads, workspaceQuery }) {
    function loadWorkspaceId() {
      return workspaceQuery.loadWorkspaceId();
    }

    async function loadWorkspaceRecords(workspaceId) {
      const requests = reads.map((read) => [
        read.key,
        () => workspaceQuery.runWorkspaceRead(workspaceId, read),
      ]);

      const results = await Promise.all(requests.map(([, run]) => run()));
      const failedResult = results.find((result) => result.error);
      if (failedResult) {
        throw failedResult.error;
      }

      return Object.fromEntries(
        requests.map(([key], index) => [key, results[index].data || []]),
      );
    }

    return Object.freeze({ loadWorkspaceId, loadWorkspaceRecords });
  }

  window.PropertyDeskWorkspaceData = Object.freeze({ create });
})();
