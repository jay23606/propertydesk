/* Confirm uncertain CSV commits from refreshed workspace import history. */
(() => {
  "use strict";

  function createImportBatchReconciliation({
    getWorkspaceOwnerId,
    getImportBatches,
    getImportedRows,
    fetchAll,
    toast,
    refreshWorkspace,
  }) {
    function normalizedSourceName(sourceName) {
      return (
        String(sourceName || "")
          .trim()
          .slice(0, 255) || "CSV import"
      );
    }

    function batchMatchesSource(batch, sourceName) {
      return (
        batch.source_type === "csv" &&
        batch.source_name === normalizedSourceName(sourceName)
      );
    }

    function batchHasImportedRows(batch) {
      return (getImportedRows() || []).some(
        (row) => row.import_batch_id === batch.id,
      );
    }

    function matchesCommittedBatch(batch, sourceName, total) {
      return (
        batch.user_id === getWorkspaceOwnerId() &&
        batchMatchesSource(batch, sourceName) &&
        batch.status === "committed" &&
        Number(batch.rows_total) === Number(total) &&
        batchHasImportedRows(batch)
      );
    }

    function captureBaselineBatchIds(sourceName, total) {
      const importBatches = getImportBatches();
      return Array.isArray(importBatches)
        ? new Set(
            importBatches
              .filter((batch) =>
                matchesCommittedBatch(batch, sourceName, total),
              )
              .map(({ id }) => id),
          )
        : null;
    }

    async function recoverCommit({
      error,
      baselineBatchIds,
      sourceName,
      total,
    }) {
      if (baselineBatchIds === null || !fetchAll || error?.code) throw error;

      let committedBatch;
      const refreshed = await refreshWorkspace({
        fetchAll,
        afterRefresh: () => {
          committedBatch = getImportBatches().find(
            (batch) =>
              !baselineBatchIds.has(batch.id) &&
              matchesCommittedBatch(batch, sourceName, total),
          );
        },
        toast,
        refreshFailureMessage:
          "Import result couldn't be confirmed, and import history could not refresh. Reload before retrying.",
      });
      if (!refreshed) {
        throw new Error(
          "Import result couldn't be confirmed. Import history could not refresh.",
        );
      }
      if (!committedBatch) {
        throw new Error(
          "Import history was refreshed, but no matching completed batch appeared. Check Reports before trying again.",
        );
      }
      return committedBatch;
    }

    return Object.freeze({ captureBaselineBatchIds, recoverCommit });
  }

  window.PropertyDeskImportBatchReconciliation = Object.freeze({
    create: createImportBatchReconciliation,
  });
})();
