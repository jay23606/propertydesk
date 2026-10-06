/* Validate and normalize account import rows before import review. */
(() => {
  "use strict";

  const { csvMoney, csvRate, validIsoDate, validateImportRows } =
    globalThis.PropertyDeskImportUtils;
  const { accountTypes, paymentFrequencies, propertyKinds } =
    globalThis.PropertyDeskDomainOptions;
  const accountTypeValues = new Set(accountTypes.map(({ value }) => value));
  const paymentFrequencyValues = new Set(
    paymentFrequencies.map(({ value }) => value),
  );
  const propertyKindValues = new Set(propertyKinds.map(({ value }) => value));

  function validateAccountRows(rows, properties, accounts, today) {
    const seenAccounts = new Set();
    const propertyById = new Map(
      properties.map((property) => [property.id, property]),
    );
    const accountKey = (name, propertyName, propertyAddress) =>
      JSON.stringify([
        name.toLowerCase(),
        propertyName.toLowerCase(),
        propertyAddress.toLowerCase(),
      ]);
    const existingAccounts = new Set(
      accounts.flatMap((account) => {
        const property = propertyById.get(account.property_id);
        return property
          ? [accountKey(account.name, property.name, property.address)]
          : [];
      }),
    );
    return validateImportRows(rows, (row) => {
      const required = [
        "property_name",
        "property_address",
        "account_type",
        "account_name",
      ];
      for (const key of required)
        if (!row[key]) throw new Error(`Missing required value “${key}”.`);
      const type = row.account_type.toLowerCase();
      if (!accountTypeValues.has(type))
        throw new Error(
          `Invalid account_type “${row.account_type}”. Use rental, land_contract, or note.`,
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
      const amount = csvMoney(
        row.payment_amount,
        `${row.account_name} payment amount`,
        { optional: true },
      );
      const principal =
        type === "rental"
          ? 0
          : csvMoney(row.original_principal, `${row.account_name} principal`, {
              optional: true,
            });
      const principalInterestAmount =
        type === "rental" || !row.principal_interest_amount
          ? null
          : csvMoney(
              row.principal_interest_amount,
              `${row.account_name} P&I payment`,
            );
      const escrowAmount =
        type === "rental"
          ? 0
          : csvMoney(row.escrow_amount, `${row.account_name} monthly escrow`, {
              optional: true,
            });
      const openingBalance =
        (row.ledger_opening_balance || "").trim() === ""
          ? null
          : csvMoney(
              row.ledger_opening_balance,
              `${row.account_name} opening balance`,
            );
      if (openingBalance !== null && !row.ledger_opening_date)
        throw new Error(
          `A ledger opening date is required when an opening balance is set for ${row.account_name}.`,
        );
      const rate = csvRate(
        row.interest_rate,
        `${row.account_name} interest rate`,
        { optional: true },
      );
      const frequency = row.payment_frequency || "monthly",
        startDate = row.start_date || today;
      if (
        !paymentFrequencyValues.has(frequency) ||
        !validIsoDate(startDate) ||
        (row.next_due_date && !validIsoDate(row.next_due_date)) ||
        (row.balloon_date && !validIsoDate(row.balloon_date)) ||
        (row.ledger_opening_date && !validIsoDate(row.ledger_opening_date))
      )
        throw new Error(
          `Invalid payment frequency or date for ${row.account_name}.`,
        );
      const term = row.term_months ? Number(row.term_months) : null,
        graceDays = Number(row.grace_days || 0);
      if (term !== null && (!Number.isInteger(term) || term < 1))
        throw new Error(
          `Term months must be a positive whole number for ${row.account_name}.`,
        );
      if (!Number.isInteger(graceDays) || graceDays < 0)
        throw new Error(
          `Grace days must be a nonnegative whole number for ${row.account_name}.`,
        );
      const propertyKind = row.property_kind || "residential";
      if (!propertyKindValues.has(propertyKind))
        throw new Error(
          `Invalid property_kind “${row.property_kind}” for ${row.property_name}.`,
        );
      const lateFee = csvMoney(row.late_fee, `${row.account_name} late fee`, {
        optional: true,
      });
      const partyEmail = (row.party_email || "")
        .split(/[;,]/)
        .map((email) => email.trim())
        .filter(Boolean);
      if (partyEmail.some((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))
        throw new Error(`Invalid tenant/buyer email for ${row.account_name}.`);
      seenAccounts.add(key);
      return {
        property_name: row.property_name,
        property_address: row.property_address,
        account_type: type,
        account_name: row.account_name,
        party_name: row.party_name || "",
        party_email: partyEmail.join(", "),
        party_phone: (row.party_phone || "").trim(),
        start_date: startDate,
        next_due_date: row.next_due_date || "",
        payment_amount: amount,
        payment_frequency: frequency,
        original_principal: principal,
        principal_interest_amount: principalInterestAmount,
        escrow_amount: escrowAmount,
        ledger_opening_balance: openingBalance,
        ledger_opening_date: row.ledger_opening_date || "",
        interest_rate: rate,
        term_months: row.term_months || "",
        balloon_date: row.balloon_date || "",
        late_fee: lateFee,
        grace_days: graceDays,
        notes: row.notes || "",
        city: row.city || null,
        state: row.state || null,
        postal_code: row.postal_code || null,
        property_kind: propertyKind,
      };
    });
  }

  const validation = Object.freeze({ validateAccountRows });
  globalThis.PropertyDeskAccountImportValidation = validation;
  if (typeof module !== "undefined" && module.exports)
    module.exports = validation;
})();
