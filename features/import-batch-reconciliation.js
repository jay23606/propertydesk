/* Confirm uncertain CSV commits from refreshed workspace import history. */
(() => {
  "use strict";

  function createImportBatchReconciliation({ state, fetchAll, toast }) {
    function matchesCommittedBatch(batch, sourceName, total, collection) {
      const normalizedName =
        String(sourceName || "")
          .trim()
          .slice(0, 255) || "CSV import";
      return (
        batch.user_id === state.workspaceOwnerId &&
        batch.source_type === "csv" &&
        batch.source_name === normalizedName &&
        batch.status === "committed" &&
        Number(batch.rows_total) === Number(total) &&
        (state[collection] || []).some(
          (row) => row.import_batch_id === batch.id,
        )
      );
    }

    function captureBaselineBatchIds(sourceName, total, collection) {
      return Array.isArray(state?.importBatches)
        ? new Set(
            state.importBatches
              .filter((batch) =>
                matchesCommittedBatch(batch, sourceName, total, collection),
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
      collection,
    }) {
      if (baselineBatchIds === null || !fetchAll || error?.code) throw error;

      let committedBatch;
      const refreshed =
        await window.PropertyDeskRepositoryWriteFeedback.refreshWorkspace({
          fetchAll,
          afterRefresh: () => {
            committedBatch = state.importBatches.find(
              (batch) =>
                !baselineBatchIds.has(batch.id) &&
                matchesCommittedBatch(batch, sourceName, total, collection),
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
