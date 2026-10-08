/* Handle write results and workspace reload feedback. */
(() => {
  "use strict";

  async function run({
    operation,
    toast,
    failureMessage,
    errorMessage = (error) => error.message,
    resultFailureMessage = () => null,
    onUnconfirmed,
  }) {
    let result;
    let error;
    try {
      result = await operation();
      ({ error } = result);
    } catch (error) {
      if (onUnconfirmed) {
        try {
          return (await onUnconfirmed(error)) === true;
        } catch {
          toast(failureMessage);
        }
      } else {
        toast(failureMessage);
      }
      return false;
    }
    if (error) {
      toast(errorMessage(error));
      return false;
    }
    const resultMessage = resultFailureMessage(result);
    if (resultMessage) {
      toast(resultMessage);
      return false;
    }
    return true;
  }

  async function refreshWorkspace({
    fetchAll,
    beforeRefresh,
    afterRefresh,
    toast,
    successMessage,
    refreshFailureMessage,
  }) {
    beforeRefresh?.();
    try {
      await fetchAll();
    } catch {
      if (refreshFailureMessage) toast(refreshFailureMessage);
      return false;
    }
    afterRefresh?.();
    if (successMessage) toast(successMessage);
    return true;
  }

  const reconciliation = window.PropertyDeskWorkspaceWriteReconciliation.create(
    {
      run,
      refreshWorkspace,
    },
  );
  const recordWrites = window.PropertyDeskWorkspaceRecordWriteWorkflow.create({
    run,
    reconcileWorkspaceChange: reconciliation.reconcileWorkspaceChange,
    finishWorkspaceWrite: reconciliation.finishWorkspaceWrite,
  });

  function selectRecordWriteCompletion(options = {}) {
    return {
      onSaved: options.onSaved,
      onRefreshed: options.onRefreshed,
      onReconciled: options.onReconciled,
      afterRefresh: options.afterRefresh,
      successMessage: options.successMessage,
      savedRefreshFailureMessage: options.savedRefreshFailureMessage,
    };
  }

  window.PropertyDeskRepositoryWriteFeedback = Object.freeze({
    run,
    refreshWorkspace,
    reconcileWorkspaceChange: reconciliation.reconcileWorkspaceChange,
    runAndRefreshWorkspaceChange: reconciliation.runAndRefreshWorkspaceChange,
    saveWorkspaceRecord: recordWrites.saveWorkspaceRecord,
    saveAndRefreshWorkspaceRecord: recordWrites.saveAndRefreshWorkspaceRecord,
    selectRecordWriteCompletion,
  });
})();
