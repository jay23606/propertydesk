/* Identify duplicate account rows against the workspace and current import. */
(() => {
  "use strict";

  function accountKey(name, propertyName, propertyAddress) {
    return JSON.stringify([
      name.toLowerCase(),
      propertyName.toLowerCase(),
      propertyAddress.toLowerCase(),
    ]);
  }

  function createContext(properties, accounts, accountTypes) {
    const propertyById = new Map(
      properties.map((property) => [property.id, property]),
    );
    const existingAccounts = new Set(
      accounts.flatMap((account) => {
        const property = propertyById.get(account.property_id);
        return property
          ? [accountKey(account.name, property.name, property.address)]
          : [];
      }),
    );
    return { accountTypes, existingAccounts, seenAccounts: new Set() };
  }

  function validate(row, { accountTypes, existingAccounts, seenAccounts }) {
    const required = [
      "property_name",
      "property_address",
      "account_type",
      "account_name",
    ];
    for (const key of required)
      if (!row[key]) throw new Error(`Missing required value “${key}”.`);
    const type = row.account_type.toLowerCase();
    if (!accountTypes.has(type))
      throw new Error(
        `Invalid account_type “${row.account_type}”. Use ${[...accountTypes].join(", ")}.`,
      );
    const key = accountKey(
      row.account_name,
      row.property_name,
      row.property_address,
    );
    if (existingAccounts.has(key) || seenAccounts.has(key))
      throw new Error(
        `Possible duplicate account: ${row.account_name} at ${row.property_address}.`,
      );
    return { type, key };
  }

  const identity = Object.freeze({ accountKey, createContext, validate });
  globalThis.PropertyDeskAccountImportIdentity = identity;
  if (typeof module !== "undefined" && module.exports)
    module.exports = identity;
})();
