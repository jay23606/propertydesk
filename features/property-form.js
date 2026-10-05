/* Property creation and editing workflow. */
(() => {
  "use strict";

  function createPropertyForm({ $, state, toast, closeModal, fetchAll }) {
    function resetPropertyForm() {
      $("property-form").reset();
      $("property-id").value = "";
      $("property-modal-title").textContent = "Add property";
    }

    async function saveProperty(event) {
      event.preventDefault();
      const id = $("property-id").value;
      const payload = {
        user_id: state.workspaceOwnerId,
        name: $("property-name").value.trim(),
        address: $("property-address").value.trim(),
        city: $("property-city").value.trim() || null,
        state: $("property-state").value.trim().toUpperCase() || null,
        postal_code: $("property-zip").value.trim() || null,
        property_kind: $("property-kind").value,
        notes: $("property-notes").value.trim() || null,
      };
      const query = id
        ? state.client.from("pd_properties").update(payload).eq("id", id)
        : state.client.from("pd_properties").insert(payload);
      let error;
      try {
        ({ error } = await query);
      } catch {
        toast("Property couldn't be saved right now. Check your connection and try again.");
        return;
      }
      if (error) {
        toast(error.message);
        return;
      }
      closeModal($("property-modal"));
      resetPropertyForm();
      try {
        await fetchAll();
      } catch {
        return;
      }
      toast(id ? "Property updated" : "Property added");
    }

    function attachEvents() {
      $("property-form").addEventListener("submit", saveProperty);
    }

    return { resetPropertyForm, saveProperty, attachEvents };
  }

  window.PropertyDeskPropertyForm = Object.freeze({ create: createPropertyForm });
})();
