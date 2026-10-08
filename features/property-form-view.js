/* Read, reset, and bind property-form presentation without saving data. */
(() => {
  "use strict";

  function create({ $ }) {
    function resetPropertyForm() {
      $("property-form").reset();
      $("property-id").value = "";
      $("property-modal-title").textContent = "Add property";
    }

    function readValues() {
      return {
        id: $("property-id").value,
        name: $("property-name").value.trim(),
        address: $("property-address").value.trim(),
        city: $("property-city").value.trim() || null,
        state: $("property-state").value.trim().toUpperCase() || null,
        postal_code: $("property-zip").value.trim() || null,
        property_kind: $("property-kind").value,
        notes: $("property-notes").value.trim() || null,
      };
    }

    function attachEvents(saveProperty) {
      $("property-form").addEventListener("submit", saveProperty);
    }

    return Object.freeze({ resetPropertyForm, readValues, attachEvents });
  }

  window.PropertyDeskPropertyFormView = Object.freeze({ create });
})();
