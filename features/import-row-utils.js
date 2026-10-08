/* Match, validate, and select rows during CSV import review. */
(() => {
  "use strict";

  function createImportLookup(properties, accounts) {
    const propertiesByNormalizedAddress = new Map();
    const propertiesByAddress = new Map();
    for (const property of properties) {
      const exactKey = JSON.stringify([property.name, property.address]);
      const normalizedKey = JSON.stringify([
        property.name.toLowerCase(),
        property.address.toLowerCase(),
      ]);
      if (!propertiesByAddress.has(exactKey))
        propertiesByAddress.set(exactKey, property);
      if (!propertiesByNormalizedAddress.has(normalizedKey))
        propertiesByNormalizedAddress.set(normalizedKey, property);
    }

    const accountsByNormalizedName = new Map();
    const accountsByName = new Map();
    for (const account of accounts) {
      const exactKey = JSON.stringify([account.property_id, account.name]);
      const normalizedKey = JSON.stringify([
        account.property_id,
        account.name.toLowerCase(),
      ]);
      if (!accountsByName.has(exactKey)) accountsByName.set(exactKey, account);
      if (!accountsByNormalizedName.has(normalizedKey))
        accountsByNormalizedName.set(normalizedKey, account);
    }

    return Object.freeze({
      findProperty(name, address) {
        return propertiesByNormalizedAddress.get(
          JSON.stringify([
            String(name || "").toLowerCase(),
            String(address || "").toLowerCase(),
          ]),
        );
      },
      findExactProperty(name, address) {
        return propertiesByAddress.get(JSON.stringify([name, address]));
      },
      findAccount(propertyId, name) {
        return accountsByNormalizedName.get(
          JSON.stringify([propertyId, String(name || "").toLowerCase()]),
        );
      },
      findExactAccount(propertyId, name) {
        return accountsByName.get(JSON.stringify([propertyId, name]));
      },
    });
  }

  function resolveImportProperty(row, lookup, missingMessage) {
    const property = lookup.findProperty(
      row.property_name,
      row.property_address,
    );
    if (!property) throw new Error(missingMessage(row));
    return property;
  }

  function markPossibleDuplicates(rows, existingKeys, keyForRow) {
    const seen = new Set(existingKeys);
    return rows.map((row) => {
      const key = keyForRow(row);
      const possibleDuplicate = seen.has(key);
      seen.add(key);
      return { ...row, _possible_duplicate: possibleDuplicate };
    });
  }

  function duplicateKey(parts) {
    return JSON.stringify(parts);
  }

  function duplicateKeyAmount(value) {
    return Number(value).toFixed(2);
  }

  function duplicateKeyText(value) {
    return String(value || "")
      .trim()
      .toLowerCase();
  }

  function selectImportRows(rows, includePossibleDuplicates = false) {
    return rows.filter(
      (row) => includePossibleDuplicates || !row._possible_duplicate,
    );
  }

  function validateImportRows(rows, validateRow) {
    const valid = [],
      errors = [];
    rows.forEach((source, index) => {
      const rowNumber = source._source_row || index + 2;
      try {
        if (source._parse_error) throw new Error(source._parse_error);
        valid.push({ ...validateRow(source), _source_row: rowNumber });
      } catch (error) {
        errors.push({
          row: rowNumber,
          message: error.message || String(error),
        });
      }
    });
    return { valid, errors, total: rows.length };
  }

  const helpers = Object.freeze({
    createImportLookup,
    duplicateKey,
    duplicateKeyAmount,
    duplicateKeyText,
    markPossibleDuplicates,
    resolveImportProperty,
    selectImportRows,
    validateImportRows,
  });
  globalThis.PropertyDeskImportRows = helpers;
  if (typeof module !== "undefined" && module.exports) module.exports = helpers;
})();
