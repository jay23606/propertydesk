/* Validate and normalize account import rows before import review. */
(() => {
  "use strict";

  const { validateImportRows } = globalThis.PropertyDeskImportRows;
  const { csvMoney } = globalThis.PropertyDeskCsvValueUtils;
  const { createContext: createIdentityContext, validate: validateIdentity } =
    globalThis.PropertyDeskAccountImportIdentity;
  const { accountTypes } = globalThis.PropertyDeskDomainOptions;
  const { financialFields, scheduleFields } =
    globalThis.PropertyDeskAccountImportTerms;
  const { splitEmailAddresses, isValidEmailAddress } =
    globalThis.PropertyDeskEmailAddressUtils;
  function accountContactFields(row) {
    const partyEmail = splitEmailAddresses(row.party_email);
    if (partyEmail.some((email) => !isValidEmailAddress(email)))
      throw new Error(`Invalid tenant/buyer email for ${row.account_name}.`);
    return {
      partyEmail: partyEmail.join(", "),
      partyPhone: (row.party_phone || "").trim(),
    };
  }

  function normalizedPartyFields(row, contact) {
    return {
      party_name: row.party_name || "",
      party_email: contact.partyEmail,
      party_phone: contact.partyPhone,
    };
  }

  function normalizedAccountTermFields(row) {
    return {
      term_months: row.term_months || "",
      balloon_date: row.balloon_date || "",
    };
  }

  function optionalPropertyFields(row) {
    return {
      city: row.city || null,
      state: row.state || null,
      postal_code: row.postal_code || null,
    };
  }

  function normalizedAccountRow(
    row,
    { type, financial, schedule, lateFee, contact },
  ) {
    return {
      property_name: row.property_name,
      property_address: row.property_address,
      account_type: type,
      account_name: row.account_name,
      ...normalizedPartyFields(row, contact),
      start_date: schedule.startDate,
      next_due_date: row.next_due_date || "",
      payment_amount: financial.amount,
      payment_frequency: schedule.frequency,
      original_principal: financial.principal,
      principal_interest_amount: financial.principalInterestAmount,
      escrow_amount: financial.escrowAmount,
      ledger_opening_balance: financial.openingBalance,
      ledger_opening_date: row.ledger_opening_date || "",
      interest_rate: financial.rate,
      ...normalizedAccountTermFields(row),
      late_fee: lateFee,
      grace_days: schedule.graceDays,
      notes: row.notes || "",
      ...optionalPropertyFields(row),
      property_kind: schedule.propertyKind,
    };
  }

  function normalizeAccountRow(row, { identity, today }) {
    const { type, key } = validateIdentity(row, identity);
    const financial = financialFields(row, type);
    const schedule = scheduleFields(row, today);
    const lateFee = csvMoney(row.late_fee, `${row.account_name} late fee`, {
      optional: true,
    });
    const contact = accountContactFields(row);
    identity.seenAccounts.add(key);
    return normalizedAccountRow(row, {
      type,
      financial,
      schedule,
      lateFee,
      contact,
    });
  }

  function validateAccountRows(rows, properties, accounts, today) {
    const identity = createIdentityContext(
      properties,
      accounts,
      new Set(accountTypes.map(({ value }) => value)),
    );
    return validateImportRows(rows, (row) =>
      normalizeAccountRow(row, { identity, today }),
    );
  }

  const validation = Object.freeze({ validateAccountRows });
  globalThis.PropertyDeskAccountImportValidation = validation;
  if (typeof module !== "undefined" && module.exports)
    module.exports = validation;
})();
