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
      try {
        await fetchAll();
      } catch {
        return;
      }
      if (addAnother) {
        prepareNext(...nextArguments);
        toast(`${label} recorded. Ready for the next entry`);
        return;
      }
      closeModal($(modalId));
      toast(`${label} recorded`);
    }

    return { finishSuccessfulEntry };
  }

  window.PropertyDeskLedgerEntrySaveWorkflow = Object.freeze({ create });
})();
