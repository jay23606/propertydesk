/* Persist property records and owner-scoped property updates. */
(() => {
  "use strict";

  const { saveById, updateOwnedById } = window.PropertyDeskRepositoryQueryUtils;

  function create({ getClient }) {
    function save(payload, propertyId) {
      return saveById(getClient(), "pd_properties", payload, propertyId);
    }

    function updateOwned(propertyId, ownerId, values) {
      return updateOwnedById(
        getClient(),
        "pd_properties",
        propertyId,
        ownerId,
        values,
      );
    }

    return Object.freeze({ save, updateOwned });
  }

  window.PropertyDeskPropertyRepository = Object.freeze({ create });
})();
