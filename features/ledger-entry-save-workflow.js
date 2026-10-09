/* Share transaction correction routing and post-save completion. */
(() => {
  "use strict";

  function create({
    $,
    getPendingCorrection,
    saveCorrection,
    closeModal,
    toast,
  }) {
    function successfulEntryCompletion({
      label,
      addAnother,
      modalId,
      resetAfterSave,
      prepareNext,
    }) {
      const successMessage = addAnother
        ? `${label} recorded. Ready for the next entry`
        : `${label} recorded`;
      function finishFormAction() {
        if (addAnother) prepareNext();
        else closeModal($(modalId));
      }

      return {
        onSaved: () => resetAfterSave(),
        onRefreshed: ({ recordWasSaved }) => {
          if (!recordWasSaved) return;
          resetAfterSave();
          finishFormAction();
        },
        afterRefresh: finishFormAction,
        onReconciled: () => toast(successMessage),
        successMessage,
        savedRefreshFailureMessage: `${label} was saved, but the workspace could not refresh. Reload before recording it again.`,
      };
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
      prepareNext,
    }) {
      if (getPendingCorrection()?.kind === kind) {
        await saveCorrection(kind, buildCorrection(payload));
        return;
      }

      const completion = successfulEntryCompletion({
        label,
        addAnother: event.submitter?.id === `${kind}-save-next`,
        modalId,
        resetAfterSave,
        prepareNext,
      });
      return insert({ payload, failureMessage, completion });
    }

    return Object.freeze({ saveTransactionEntry });
  }

  window.PropertyDeskLedgerEntrySaveWorkflow = Object.freeze({ create });
})();
