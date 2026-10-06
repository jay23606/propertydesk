/* Resolve imported rows to current workspace properties and accounts. */
(() => {
  "use strict";

  function createImportReferences() {
    function findProperty(properties, name, address) {
      return properties.find(
        (property) => property.name === name && property.address === address,
      );
    }

    function findAccount(accounts, propertyId, name) {
      return accounts.find(
        (account) =>
          account.property_id === propertyId && account.name === name,
      );
    }

    return { findProperty, findAccount };
  }

  window.PropertyDeskImportReferences = Object.freeze({
    create: createImportReferences,
  });
})();
