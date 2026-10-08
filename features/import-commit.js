/* Refresh the workspace and report results after persisted import batches. */
(() => {
  "use strict";

  function createImportCommit({ fetchAll, status, toast, repository }) {
    function importRefreshError(error) {
      const refreshError = new Error(
        error?.message ||
          "Workspace refresh failed after the import was saved.",
      );
      refreshError.importPersisted = true;
      return refreshError;
    }

    async function finish({ data, fallbackCount, total, label, toastMessage }) {
      const imported = Number(data?.rows_accepted ?? fallbackCount);
      const rejected = total - imported;
      status.textContent = `Imported ${imported} ${label}${imported === 1 ? "" : "s"}; ${rejected} row${rejected === 1 ? " was" : "s were"} skipped or need correction. Source saved to import history.`;
      status.classList.add("success");
      try {
        await fetchAll();
      } catch (error) {
        throw importRefreshError(error);
      }
      toast(
        toastMessage ||
          `${label[0].toUpperCase()}${label.slice(1)} import complete`,
      );
    }

    async function commitAccounts({ rows, sourceName, total }) {
      const data = await repository.commitAccounts({ rows, sourceName, total });
      await finish({
        data,
        fallbackCount: rows.length,
        total,
        label: "account",
        toastMessage: "Import complete",
      });
    }

    async function commitTransactions({
      kind,
      rows,
      sourceName,
      total,
      label,
    }) {
      const data = await repository.commitTransactions({
        kind,
        rows,
        sourceName,
        total,
      });
      await finish({ data, fallbackCount: rows.length, total, label });
    }

    return Object.freeze({ commitAccounts, commitTransactions });
  }

  window.PropertyDeskImportCommit = Object.freeze({
    create: createImportCommit,
  });
})();
