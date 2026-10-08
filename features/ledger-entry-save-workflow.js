/* Share transaction correction routing and post-save completion. */
(() => {
  "use strict";

  function create({ $, state, saveCorrection, closeModal, fetchAll, toast }) {
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

    async function saveTransactionEntry({
      kind,
      event,
      payload,
      buildCorrection,
      insert,
      failureMessage,
      label,
      modalId,
      resetAfterSave,
      resetArguments = [],
      prepareNext,
      nextArguments = [],
    }) {
      if (state.pendingCorrection?.kind === kind) {
        await saveCorrection(kind, buildCorrection(payload));
        return;
      }

      const saved = await insert({ payload, failureMessage });
      if (!saved) return;

      await finishSuccessfulEntry({
        label,
        addAnother: event.submitter?.id === `${kind}-save-next`,
        modalId,
        resetAfterSave,
        resetArguments,
        prepareNext,
        nextArguments,
      });
    }

    return { finishSuccessfulEntry, saveTransactionEntry };
  }

  window.PropertyDeskLedgerEntrySaveWorkflow = Object.freeze({ create });
})();
