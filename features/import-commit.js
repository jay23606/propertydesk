/* Refresh the workspace and report results after persisted import batches. */
(() => {
  "use strict";

  function createImportCommit({ state, fetchAll, status, toast, repository }) {
    const batchReconciliation =
      window.PropertyDeskImportBatchReconciliation.create({
        state,
        fetchAll,
        toast,
      });

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

    async function commitWithReconciliation({
      operation,
      sourceName,
      total,
      rows,
      label,
      toastMessage,
      collection,
    }) {
      const baselineBatchIds = batchReconciliation.captureBaselineBatchIds(
        sourceName,
        total,
        collection,
      );
      let data;
      try {
        data = await operation();
      } catch (error) {
        data = await batchReconciliation.recoverCommit({
          error,
          baselineBatchIds,
          sourceName,
          total,
          collection,
        });
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
