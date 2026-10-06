/* Persist property records and owner-scoped property updates. */
(() => {
  "use strict";

  const { saveById, updateOwnedById } = window.PropertyDeskRepositoryQueryUtils;

  function save(client, payload, propertyId) {
    return saveById(client, "pd_properties", payload, propertyId);
  }

  function updateOwned(client, propertyId, ownerId, values) {
    return updateOwnedById(
      client,
      "pd_properties",
      propertyId,
      ownerId,
      values,
    );
  }

  window.PropertyDeskPropertyRepository = Object.freeze({
    save,
    updateOwned,
  });
})();
