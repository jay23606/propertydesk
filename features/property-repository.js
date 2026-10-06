/* Persist property records and owner-scoped property updates. */
(() => {
  "use strict";

  function save(client, payload, propertyId) {
    return propertyId
      ? client.from("pd_properties").update(payload).eq("id", propertyId)
      : client.from("pd_properties").insert(payload);
  }

  function updateOwned(client, propertyId, ownerId, values) {
    return client
      .from("pd_properties")
      .update(values)
      .eq("id", propertyId)
      .eq("user_id", ownerId);
  }

  window.PropertyDeskPropertyRepository = Object.freeze({
    save,
    updateOwned,
  });
})();
