/* Share the post-save refresh, reset, and close-or-continue sequence. */
(() => {
  "use strict";

  function create({ $, closeModal, fetchAll, toast }) {
    async function finishSuccessfulEntry({
      label,
      addAnother,
      modalId,
      resetAfterSave,
      resetArguments = [],
      prepareNext,
      nextArguments = [],
    }) {
      resetAfterSave(...resetArguments);
      await window.PropertyDeskRepositoryWriteFeedback.refreshWorkspace({
        fetchAll,
        afterRefresh: () => {
          if (addAnother) prepareNext(...nextArguments);
          else closeModal($(modalId));
        },
        toast,
        successMessage: addAnother
          ? `${label} recorded. Ready for the next entry`
          : `${label} recorded`,
      });
    }

    return { finishSuccessfulEntry };
  }

  window.PropertyDeskLedgerEntrySaveWorkflow = Object.freeze({ create });
})();
