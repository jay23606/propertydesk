/* Start account entry with a property selected when one is provided. */
(() => {
  "use strict";

  function create({ resetAccountForm, populateFormOptions, openModal, $ }) {
    function openAccountForProperty(propertyId) {
      resetAccountForm();
      populateFormOptions();
      if (propertyId) $("account-property").value = propertyId;
      openModal("account-modal");
    }

    return { openAccountForProperty };
  }

  window.PropertyDeskPropertyAccountAction = Object.freeze({ create });
})();
