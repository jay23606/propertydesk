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

    function payloadMatchesRecord(record, payload) {
      return Object.entries(payload).every(([key, value]) => {
        const actual = record[key];
        if (value == null) return actual == null;
        if (typeof value === "number") return Number(actual) === value;
        return actual === value;
      });
    }

    async function saveWorkspaceRecord({
      operation,
      state,
      collection,
      payload,
      recordId,
      fetchAll,
      toast,
      failureMessage,
      errorMessage,
      refreshFailureMessage,
      retryMessage,
      onRefreshed,
      onReconciled,
    }) {
      const initialRecords = state?.[collection];
      const previousCount =
        recordId || !Array.isArray(initialRecords)
          ? null
          : initialRecords.filter((record) =>
              payloadMatchesRecord(record, payload),
            ).length;
      const onUnconfirmed =
        Array.isArray(initialRecords) && fetchAll
          ? async () => {
              let recordWasSaved = false;
              return reconcileWorkspaceChange({
                fetchAll,
                afterRefresh: () => {
                  const records = state[collection] || [];
                  recordWasSaved = recordId
                    ? records.some(
                        (record) =>
                          record.id === recordId &&
                          payloadMatchesRecord(record, payload),
                      )
                    : records.filter((record) =>
                        payloadMatchesRecord(record, payload),
                      ).length > previousCount;
                  onRefreshed?.({ recordWasSaved });
                },
                isConfirmed: () => recordWasSaved,
                toast,
                refreshFailureMessage,
                retryMessage,
                onConfirmed: onReconciled,
              });
            }
          : undefined;

      return run({
        operation,
        toast,
        failureMessage,
        errorMessage,
        onUnconfirmed,
      });
    }

    async function saveAndRefreshWorkspaceRecord({
      onSaved,
      afterRefresh,
      successMessage,
      savedRefreshFailureMessage,
      ...saveOptions
    }) {
      let reconciled = false;
      const onReconciled = saveOptions.onReconciled;
      const saved = await saveWorkspaceRecord({
        ...saveOptions,
        onReconciled: (...args) => {
          reconciled = true;
          onReconciled?.(...args);
        },
      });
      return finishWorkspaceWrite({
        saved,
        reconciled,
        onSaved,
        fetchAll: saveOptions.fetchAll,
        afterRefresh,
        toast: saveOptions.toast,
        successMessage,
        refreshFailureMessage:
          savedRefreshFailureMessage || saveOptions.refreshFailureMessage,
      });
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
      saveWorkspaceRecord,
      saveAndRefreshWorkspaceRecord,
      runAndRefreshWorkspaceChange,
    });
  }

  window.PropertyDeskWorkspaceWriteReconciliation = Object.freeze({ create });
})();
