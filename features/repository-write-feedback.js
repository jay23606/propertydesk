/* Share save-result handling while leaving fallback messages with each domain. */
(() => {
  "use strict";

  async function run({ operation, toast, failureMessage }) {
    let error;
    try {
      ({ error } = await operation());
    } catch {
      toast(failureMessage);
      return false;
    }
    if (error) {
      toast(error.message);
      return false;
    }
    return true;
  }

  window.PropertyDeskRepositoryWriteFeedback = Object.freeze({ run });
})();
