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
      const refreshed =
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
      if (!refreshed)
        toast(
          `${label} was saved, but the workspace could not refresh. Reload before recording it again.`,
        );
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

    return Object.freeze({ saveTransactionEntry });
  }

  window.PropertyDeskLedgerEntrySaveWorkflow = Object.freeze({ create });
})();
