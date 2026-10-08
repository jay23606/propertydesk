/* Share successful property and account form completion. */
(() => {
  "use strict";

  function create({ $, closeModal, fetchAll, toast }) {
    async function save({ persist, payload, id, modalId, resetForm, label }) {
      if (!(await persist(payload, id))) return false;
      closeModal($(modalId));
      resetForm();
      await window.PropertyDeskRepositoryWriteFeedback.refreshWorkspace({
        fetchAll,
        toast,
        successMessage: `${label} ${id ? "updated" : "added"}`,
        refreshFailureMessage: `${label} was saved, but the workspace could not refresh. Reload to verify the change.`,
      });
      return true;
    }

    return Object.freeze({ save });
  }

  window.PropertyDeskWorkspaceFormSaveWorkflow = Object.freeze({ create });
})();
