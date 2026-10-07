/* Shared CSV validation, duplicate detection, and import lookup helpers. */
(() => {
  "use strict";

  const csvParser = globalThis.PropertyDeskCsvParser;
  if (!csvParser) throw new Error("The PropertyDesk CSV parser is not loaded.");
  const moneyInput = globalThis.PropertyDeskMoneyInputUtils?.moneyInput;
  if (!moneyInput)
    throw new Error("The PropertyDesk money input helper is not loaded.");

  function hasValidCsvMoneyFormat(raw) {
    const number = "(?:\\d+|\\d{1,3}(?:,\\d{3})+)(?:\\.\\d{1,2})?";
    return (
      new RegExp(`^\\(\\s*\\$?\\s*${number}\\s*\\)$`).test(raw) ||
      new RegExp(`^\\$?\\s*${number}$`).test(raw)
    );
  }

  function validateMinimumAmount(amount, label, minimum) {
    if (amount < minimum)
      throw new Error(
        `Amount for ${label} must be ${minimum === 0 ? "zero or greater" : "greater than zero"}.`,
      );
  }

  function csvMoney(value, label, { optional = false, minimum = 0 } = {}) {
    const raw = String(value ?? "").trim();
    if (!raw && optional) return 0;
    if (!hasValidCsvMoneyFormat(raw))
      throw new Error(`Invalid amount “${raw}” for ${label}.`);
    const amount = moneyInput(raw);
    validateMinimumAmount(amount, label, minimum);
    return amount;
  }

  function csvRate(value, label, { optional = false } = {}) {
    const raw = String(value ?? "")
      .trim()
      .replace(/%$/, "")
      .trim();
    if (!raw && optional) return 0;
    if (!/^\d+(?:\.\d{1,5})?$/.test(raw))
      throw new Error(`Invalid rate “${value}” for ${label}.`);
    const rate = Number(raw);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100)
      throw new Error(`Rate for ${label} must be between 0 and 100%.`);
    return rate;
  }

  function validIsoDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return false;
    const date = new Date(`${value}T12:00:00`);
    return (
      !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    );
  }

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

  function markPossibleDuplicates(rows, existingKeys, keyForRow) {
    const seen = new Set(existingKeys);
    return rows.map((row) => {
      const key = keyForRow(row);
      const possibleDuplicate = seen.has(key);
      seen.add(key);
      return { ...row, _possible_duplicate: possibleDuplicate };
    });
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
    csvMoney,
    csvRate,
    createImportLookup,
    markPossibleDuplicates,
    parseCSV: csvParser.parseCSV,
    selectImportRows,
    validIsoDate,
    validateImportRows,
  });
  globalThis.PropertyDeskImportUtils = helpers;
  if (typeof module !== "undefined" && module.exports) module.exports = helpers;
})();
