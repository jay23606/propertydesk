/* Persist workspace-scoped property-holder assignments. */
(() => {
  "use strict";

  const { insert: insertRecord } = window.PropertyDeskRepositoryQueryUtils;

  function create({ getClient }) {
    async function clearPropertyHolders(ownerId, propertyId) {
      return getClient()
        .from("pd_property_holders")
        .delete()
        .eq("user_id", ownerId)
        .eq("property_id", propertyId);
    }

    async function addPropertyHolders(ownerId, propertyId, memberIds) {
      const rows = memberIds.map((member_user_id) => ({
        user_id: ownerId,
        property_id: propertyId,
        member_user_id,
      }));
      return insertRecord(getClient(), "pd_property_holders", rows);
    }

    return { clearPropertyHolders, addPropertyHolders };
  }

  window.PropertyDeskPropertyHolderRepository = Object.freeze({ create });
})();
