/* Share save-result handling while leaving fallback messages with each domain. */
(() => {
  "use strict";

  async function run({
    operation,
    toast,
    failureMessage,
    errorMessage = (error) => error.message,
  }) {
    let error;
    try {
      ({ error } = await operation());
    } catch {
      toast(failureMessage);
      return false;
    }
    if (error) {
      toast(errorMessage(error));
      return false;
    }
    return true;
  }

  window.PropertyDeskRepositoryWriteFeedback = Object.freeze({ run });
})();
