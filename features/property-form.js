/* Property creation and editing workflow. */
(() => {
  "use strict";

  function createPropertyForm({
    $,
    state,
    toast,
    closeModal,
    fetchAll,
    repository,
  }) {
    const formView = window.PropertyDeskPropertyFormView.create({ $ });
    const { save: saveWorkspaceForm } =
      window.PropertyDeskWorkspaceFormSaveWorkflow.create({
        $,
        closeModal,
        toast,
      });
    const { saveProperty: persistProperty } =
      window.PropertyDeskPropertySaveMaintenance.create({
        state,
        fetchAll,
        toast,
        repository,
      });

    async function saveProperty(event) {
      event.preventDefault();
      const { id, ...values } = formView.readValues();
      const payload = {
        user_id: state.workspaceOwnerId,
        ...values,
      };
      await saveWorkspaceForm({
        persist: persistProperty,
        payload,
        id,
        modalId: "property-modal",
        resetForm: formView.resetPropertyForm,
        label: "Property",
      });
    }

    return Object.freeze({
      resetPropertyForm: formView.resetPropertyForm,
      attachEvents: () => formView.attachEvents(saveProperty),
    });
  }

  window.PropertyDeskPropertyForm = Object.freeze({
    create: createPropertyForm,
  });
})();
