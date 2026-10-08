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

    function importSummary(data, fallbackCount, total, label) {
      const imported = Number(data?.rows_accepted ?? fallbackCount);
      const rejected = total - imported;
      const importedLabel = `${label}${imported === 1 ? "" : "s"}`;
      const rejectedLabel = `row${rejected === 1 ? " was" : "s were"}`;
      return `Imported ${imported} ${importedLabel}; ${rejected} ${rejectedLabel} skipped or need correction. Source saved to import history.`;
    }

    function importSuccessMessage(label, message) {
      return (
        message || `${label[0].toUpperCase()}${label.slice(1)} import complete`
      );
    }

    async function finish({
      data,
      fallbackCount,
      total,
      label,
      toastMessage,
      alreadyRefreshed = false,
    }) {
      status.textContent = importSummary(data, fallbackCount, total, label);
      status.classList.add("success");
      if (!alreadyRefreshed) {
        try {
          await fetchAll();
        } catch (error) {
          throw importRefreshError(error);
        }
      }
      toast(importSuccessMessage(label, toastMessage));
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
