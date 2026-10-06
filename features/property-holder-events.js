/* Route delegated account-holder label actions in the property modal. */
(() => {
  "use strict";

  function create({ $, savePropertyHolders }) {
    function attachEvents() {
      $("property-detail-content").addEventListener("click", (event) => {
        if (event.target.closest("[data-save-holders]")) {
          const selectedMemberIds = [
            ...$("property-detail-content").querySelectorAll(
              "[data-holder-choice]:checked",
            ),
          ].map((input) => input.value);
          savePropertyHolders(selectedMemberIds);
        }
      });
    }

    return { attachEvents };
  }

  window.PropertyDeskPropertyHolderEvents = Object.freeze({ create });
})();
