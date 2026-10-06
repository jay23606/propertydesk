/* Compose property-grid quick-note, payment, detail, and add-account actions. */
(() => {
  "use strict";

  function create(context) {
    const {
      $,
      state,
      toast,
      fetchAll,
      streetAddress,
      openPayment,
      openPropertyDetails,
      resetAccountForm,
      populateFormOptions,
      openModal,
    } = context;
    const { editPropertyQuickNote } =
      window.PropertyDeskPropertyQuickNote.create({
        state,
        toast,
        fetchAll,
        streetAddress,
      });
    const { attachEvents } = window.PropertyDeskPropertyViewEvents.create({
      $,
      openPayment,
      editPropertyQuickNote,
      openPropertyDetails,
      resetAccountForm,
      populateFormOptions,
      openModal,
    });

    return { attachEvents };
  }

  window.PropertyDeskPropertyPortfolioActionsWorkflow = Object.freeze({
    create,
  });
})();
