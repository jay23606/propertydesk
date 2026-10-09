/* Join transaction rows to account/property records and build search text. */
(() => {
  "use strict";

  function createTransactionAssociationModel({ getProperties, getAccounts }) {
    function findTransactionProperty(row, account) {
      const propertyId =
        row.kind === "expense" ? row.item.property_id : account?.property_id;
      return getProperties().find((candidate) => candidate.id === propertyId);
    }

    function transactionSearchText(row, account, property) {
      return [
        account?.name,
        account?.party_name,
        property?.name,
        row.item.memo,
        row.item.payee,
      ]
        .map((value) => value || "")
        .join(" ")
        .toLowerCase();
    }

    function associateTransaction(row) {
      const account = getAccounts().find(
        (candidate) => candidate.id === row.item.account_id,
      );
      const property = findTransactionProperty(row, account);
      return {
        kind: row.kind,
        date: row.date,
        amount: row.amount,
        item: row.item,
        account,
        property,
        searchText: transactionSearchText(row, account, property),
      };
    }

    return Object.freeze({ associateTransaction });
  }

  window.PropertyDeskTransactionAssociationModel = Object.freeze({
    create: createTransactionAssociationModel,
  });
})();
