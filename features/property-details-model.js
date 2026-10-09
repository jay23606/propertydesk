/* Resolve the workspace records needed to render one property's details. */
(() => {
  "use strict";

  function createPropertyDetailsModel({
    getProperties,
    getAccounts,
    getDocuments,
    getWorkspaceMembers,
    getPropertyHolders,
    propertyAddress,
  }) {
    function buildPropertyDetailData(id) {
      const property = getProperties().find((row) => row.id === id);
      if (!property) return null;

      const accounts = getAccounts().filter(
        (account) => account.property_id === id,
      );
      return {
        property,
        accounts,
        propertyDocs: getDocuments().filter((doc) => doc.property_id === id),
        workspaceMembers: getWorkspaceMembers(),
        propertyHolders: getPropertyHolders(),
        propertyAddressText: propertyAddress(property),
        hasActiveAccount: accounts.some(
          (account) => account.status === "active",
        ),
      };
    }

    return Object.freeze({ buildPropertyDetailData });
  }

  window.PropertyDeskPropertyDetailsModel = Object.freeze({
    create: createPropertyDetailsModel,
  });
})();
