/* Property creation and editing workflow. */
(() => {
  "use strict";

  function createPropertyForm({
    $,
    getProperties,
    getWorkspaceOwnerId,
    toast,
    closeModal,
    fetchAll,
    repository,
    saveWorkspaceRecord,
    saveAndRefreshWorkspaceRecord,
    selectRecordWriteCompletion,
    workflows,
  }) {
    const formView = workflows.view.create({ $ });
    const { save: saveWorkspaceForm } = workflows.saveWorkflow.create({
      $,
      closeModal,
      toast,
    });
    const { saveProperty: persistProperty } = workflows.maintenance.create({
      getProperties,
      fetchAll,
      toast,
      repository,
      saveWorkspaceRecord,
      saveAndRefreshWorkspaceRecord,
      selectRecordWriteCompletion,
      recordSaveMaintenance: workflows.recordSaveMaintenance,
    });

    async function saveProperty(event) {
      event.preventDefault();
      const values = formView.readValues();
      const payload = {
        user_id: getWorkspaceOwnerId(),
        name: values.name,
        address: values.address,
        city: values.city,
        state: values.state,
        postal_code: values.postal_code,
        property_kind: values.property_kind,
        notes: values.notes,
      };
      await saveWorkspaceForm({
        persist: persistProperty,
        payload,
        id: values.id,
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
