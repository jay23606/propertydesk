/* Refresh the workspace and report results after persisted import batches. */
(() => {
  "use strict";

  function createImportCommit({ state, fetchAll, status, toast, repository }) {
    function importRefreshError(error) {
      const refreshError = new Error(
        error?.message ||
          "Workspace refresh failed after the import was saved.",
      );
      refreshError.importPersisted = true;
      return refreshError;
    }

    async function finish({
      data,
      fallbackCount,
      total,
      label,
      toastMessage,
      alreadyRefreshed = false,
    }) {
      const imported = Number(data?.rows_accepted ?? fallbackCount);
      const rejected = total - imported;
      status.textContent = `Imported ${imported} ${label}${imported === 1 ? "" : "s"}; ${rejected} row${rejected === 1 ? " was" : "s were"} skipped or need correction. Source saved to import history.`;
      status.classList.add("success");
      if (!alreadyRefreshed) {
        try {
          await fetchAll();
        } catch (error) {
          throw importRefreshError(error);
        }
      }
      toast(
        toastMessage ||
          `${label[0].toUpperCase()}${label.slice(1)} import complete`,
      );
    }

    function committedBatchMatches(batch, sourceName, total, collection) {
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

    function committedBatchCount(sourceName, total, collection) {
      return (state?.importBatches || []).filter((batch) =>
        committedBatchMatches(batch, sourceName, total, collection),
      ).length;
    }

    async function commitWithReconciliation({
      operation,
      sourceName,
      total,
      rows,
      label,
      toastMessage,
      collection,
    }) {
      const previousCount = Array.isArray(state?.importBatches)
        ? committedBatchCount(sourceName, total, collection)
        : null;
      let data;
      try {
        data = await operation();
      } catch (error) {
        if (previousCount === null || !fetchAll || error?.code) throw error;
        let committedBatch;
        const refreshed =
          await window.PropertyDeskRepositoryWriteFeedback.refreshWorkspace({
            fetchAll,
            afterRefresh: () => {
              if (
                committedBatchCount(sourceName, total, collection) <=
                previousCount
              )
                return;
              committedBatch = state.importBatches.find((batch) =>
                committedBatchMatches(batch, sourceName, total, collection),
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
        data = committedBatch;
        await finish({
          data,
          fallbackCount: rows.length,
          total,
          label,
          toastMessage,
          alreadyRefreshed: true,
        });
        return;
      }
      await finish({
        data,
        fallbackCount: rows.length,
        total,
        label,
        toastMessage,
      });
    }

    async function commitAccounts({ rows, sourceName, total }) {
      await commitWithReconciliation({
        operation: () => repository.commitAccounts({ rows, sourceName, total }),
        sourceName,
        total,
        rows,
        label: "account",
        toastMessage: "Import complete",
        collection: "accounts",
      });
    }

    async function commitTransactions({
      kind,
      rows,
      sourceName,
      total,
      label,
    }) {
      await commitWithReconciliation({
        operation: () =>
          repository.commitTransactions({ kind, rows, sourceName, total }),
        sourceName,
        total,
        rows,
        label,
        collection: kind,
      });
    }

    return Object.freeze({ commitAccounts, commitTransactions });
  }

  window.PropertyDeskImportCommit = Object.freeze({
    create: createImportCommit,
  });
})();
