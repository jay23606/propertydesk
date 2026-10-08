/* Confirm persisted workspace writes when their original response is uncertain. */
(() => {
  "use strict";

  function create({ run, refreshWorkspace }) {
    async function reconcileWorkspaceChange({
      fetchAll,
      isConfirmed,
      afterRefresh,
      toast,
      refreshFailureMessage,
      retryMessage,
      onConfirmed,
    }) {
      let confirmed = false;
      const refreshed = await refreshWorkspace({
        fetchAll,
        afterRefresh: () => {
          afterRefresh?.();
          confirmed = isConfirmed();
        },
        toast,
        refreshFailureMessage,
      });
      if (!refreshed) return false;
      if (!confirmed) {
        toast(retryMessage);
        return false;
      }
      onConfirmed?.();
      return true;
    }

    function finishWorkspaceWrite({
      saved,
      reconciled,
      onSaved,
      fetchAll,
      afterRefresh,
      toast,
      successMessage,
      refreshFailureMessage,
    }) {
      if (!saved || reconciled) return saved;

      onSaved?.();
      return refreshWorkspace({
        fetchAll,
        afterRefresh,
        toast,
        successMessage,
        refreshFailureMessage,
      });
    }

    async function runAndRefreshWorkspaceChange({
      operation,
      fetchAll,
      isConfirmed,
      toast,
      failureMessage,
      errorMessage,
      resultFailureMessage,
      refreshFailureMessage,
      retryMessage,
      onSaved,
      afterRefresh,
      successMessage,
      savedRefreshFailureMessage,
      onReconciled,
    }) {
      let reconciled = false;
      const saved = await run({
        operation,
        toast,
        failureMessage,
        errorMessage,
        resultFailureMessage,
        onUnconfirmed: () =>
          reconcileWorkspaceChange({
            fetchAll,
            isConfirmed,
            afterRefresh,
            toast,
            refreshFailureMessage,
            retryMessage,
            onConfirmed: () => {
              reconciled = true;
              onReconciled?.();
            },
          }),
      });
      return finishWorkspaceWrite({
        saved,
        reconciled,
        onSaved,
        fetchAll,
        afterRefresh,
        toast,
        successMessage,
        refreshFailureMessage:
          savedRefreshFailureMessage || refreshFailureMessage,
      });
    }

    return Object.freeze({
      reconcileWorkspaceChange,
      finishWorkspaceWrite,
      runAndRefreshWorkspaceChange,
    });
  }

  window.PropertyDeskWorkspaceWriteReconciliation = Object.freeze({ create });
})();
