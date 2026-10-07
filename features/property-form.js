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
    const { saveProperty: persistProperty } =
      window.PropertyDeskPropertyMaintenance.create({
        state,
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
      if (!(await persistProperty(payload, id))) return;
      closeModal($("property-modal"));
      formView.resetPropertyForm();
      try {
        await fetchAll();
      } catch {
        return;
      }
      toast(id ? "Property updated" : "Property added");
    }

    return {
      resetPropertyForm: formView.resetPropertyForm,
      attachEvents: () => formView.attachEvents(saveProperty),
    };
  }

  window.PropertyDeskPropertyForm = Object.freeze({
    create: createPropertyForm,
  });
})();
