/* Route delegated account-holder label actions in the property modal. */
(() => {
  "use strict";

  function create({ $, savePropertyHolders }) {
    function attachEvents() {
      $("property-detail-content").addEventListener("click", (event) => {
        if (event.target.closest("[data-save-holders]")) {
          savePropertyHolders();
        }
      });
    }

    return { attachEvents };
  }

  window.PropertyDeskPropertyHolderEvents = Object.freeze({ create });
})();
