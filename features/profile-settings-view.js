/* Read and bind the workspace profile settings form. */
(() => {
  "use strict";

  function createProfileSettingsView({ $ }) {
    function setDisplayName(value) {
      $("display-name").value = value;
    }

    function attachEvents(saveProfile) {
      $("display-name-form").addEventListener("submit", (event) => {
        event.preventDefault();
        return saveProfile($("display-name").value.trim());
      });
    }

    return Object.freeze({ attachEvents, setDisplayName });
  }

  window.PropertyDeskProfileSettingsView = Object.freeze({
    create: createProfileSettingsView,
  });
})();
