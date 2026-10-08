/* Share successful property and account form completion. */
(() => {
  "use strict";

  function create({ $, closeModal, toast }) {
    function save({ persist, payload, id, modalId, resetForm, label }) {
      const successMessage = `${label} ${id ? "updated" : "added"}`;
      function finishFormAction() {
        closeModal($(modalId));
        resetForm();
      }

      return persist(payload, id, {
        onSaved: finishFormAction,
        onRefreshed: ({ recordWasSaved }) => {
          if (recordWasSaved) finishFormAction();
        },
        onReconciled: () => toast(successMessage),
        successMessage,
        savedRefreshFailureMessage: `${label} was saved, but the workspace could not refresh. Reload to verify the change.`,
      });
    }

    return Object.freeze({ save });
  }

  window.PropertyDeskWorkspaceFormSaveWorkflow = Object.freeze({ create });
})();
