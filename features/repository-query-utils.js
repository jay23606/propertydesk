/* Share common record insert and update query construction. */
(() => {
  "use strict";

  function insert(client, table, payload) {
    return client.from(table).insert(payload);
  }

  function updateById(client, table, recordId, payload) {
    return client.from(table).update(payload).eq("id", recordId);
  }

  function saveById(client, table, payload, recordId) {
    return recordId
      ? updateById(client, table, recordId, payload)
      : client.from(table).insert(payload);
  }

  function updateOwnedById(client, table, recordId, ownerId, payload) {
    return updateById(client, table, recordId, payload).eq("user_id", ownerId);
  }

  window.PropertyDeskRepositoryQueryUtils = Object.freeze({
    insert,
    saveById,
    updateById,
    updateOwnedById,
  });
})();
