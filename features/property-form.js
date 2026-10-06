/* Property creation and editing workflow. */
(() => {
  "use strict";

  function createPropertyForm({ $, state, toast, closeModal, fetchAll }) {
    const formView = window.PropertyDeskPropertyFormView.create({ $ });

    async function saveProperty(event) {
      event.preventDefault();
      const { id, ...values } = formView.readValues();
      const payload = {
        user_id: state.workspaceOwnerId,
        ...values,
      };
      const query = id
        ? state.client.from("pd_properties").update(payload).eq("id", id)
        : state.client.from("pd_properties").insert(payload);
      let error;
      try {
        ({ error } = await query);
      } catch {
        toast(
          "Property couldn't be saved right now. Check your connection and try again.",
        );
        return;
      }
      if (error) {
        toast(error.message);
        return;
      }
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
