/* Resolve the workspace records needed to render one property's details. */
(() => {
  "use strict";

  function createPropertyDetailsModel({ state, propertyAddress }) {
    function buildPropertyDetailData(id) {
      const property = state.properties.find((row) => row.id === id);
      if (!property) return null;

      const accounts = state.accounts.filter(
        (account) => account.property_id === id,
      );
      return {
        property,
        accounts,
        propertyDocs: state.documents.filter((doc) => doc.property_id === id),
        workspaceMembers: state.workspaceMembers,
        propertyHolders: state.propertyHolders,
        propertyAddressText: propertyAddress(property),
        hasActiveAccount: accounts.some(
          (account) => account.status === "active",
        ),
      };
    }

    return { buildPropertyDetailData };
  }

  window.PropertyDeskPropertyDetailsModel = Object.freeze({
    create: createPropertyDetailsModel,
  });
})();
