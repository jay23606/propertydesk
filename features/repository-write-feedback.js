/* Share write feedback and post-write refresh handling across the workspace. */
(() => {
  "use strict";

  async function run({
    operation,
    toast,
    failureMessage,
    errorMessage = (error) => error.message,
    resultFailureMessage = () => null,
  }) {
    let result;
    let error;
    try {
      result = await operation();
      ({ error } = result);
    } catch {
      toast(failureMessage);
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

  window.PropertyDeskRepositoryWriteFeedback = Object.freeze({
    run,
    refreshWorkspace,
  });
})();
