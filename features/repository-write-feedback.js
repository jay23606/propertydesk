/* Share save-result handling while leaving fallback messages with each domain. */
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

  window.PropertyDeskRepositoryWriteFeedback = Object.freeze({ run });
})();
