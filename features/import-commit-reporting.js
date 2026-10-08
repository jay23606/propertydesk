/* Refresh the workspace and report the result of a persisted import. */
(() => {
  "use strict";

  function createImportCommitReporting({ status, fetchAll, toast }) {
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

    return Object.freeze({ finish });
  }

  window.PropertyDeskImportCommitReporting = Object.freeze({
    create: createImportCommitReporting,
  });
})();
