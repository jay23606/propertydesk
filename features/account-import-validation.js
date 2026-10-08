/* Validate and normalize account import rows before import review. */
(() => {
  "use strict";

  const { csvMoney, csvRate, validIsoDate } =
    globalThis.PropertyDeskCsvValueUtils;
  const { validateImportRows } = globalThis.PropertyDeskImportRows;
  const { createContext: createIdentityContext, validate: validateIdentity } =
    globalThis.PropertyDeskAccountImportIdentity;
  const { accountTypes, paymentFrequencies, propertyKinds, defaults } =
    globalThis.PropertyDeskDomainOptions;
  const { splitEmailAddresses, isValidEmailAddress } =
    globalThis.PropertyDeskEmailAddressUtils;
  const paymentFrequencyValues = new Set(
    paymentFrequencies.map(({ value }) => value),
  );
  const propertyKindValues = new Set(propertyKinds.map(({ value }) => value));

  function accountLoanFields(row, type) {
    if (type === "rental")
      return { principal: 0, principalInterestAmount: null, escrowAmount: 0 };

    const principalInterestAmount = row.principal_interest_amount
      ? csvMoney(
          row.principal_interest_amount,
          `${row.account_name} P&I payment`,
        )
      : null;
    return {
      principal: csvMoney(
        row.original_principal,
        `${row.account_name} principal`,
        { optional: true },
      ),
      principalInterestAmount,
      escrowAmount: csvMoney(
        row.escrow_amount,
        `${row.account_name} monthly escrow`,
        { optional: true },
      ),
    };
  }

  function openingBalanceFields(row) {
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
    return openingBalance;
  }

  function accountFinancialFields(row, type) {
    const amount = csvMoney(
      row.payment_amount,
      `${row.account_name} payment amount`,
      { optional: true },
    );
    const loan = accountLoanFields(row, type);
    const openingBalance = openingBalanceFields(row);
    const rate = csvRate(
      row.interest_rate,
      `${row.account_name} interest rate`,
      { optional: true },
    );
    return {
      amount,
      ...loan,
      openingBalance,
      rate,
    };
  }

  function validateAccountDates(row, frequency, startDate) {
    if (
      !paymentFrequencyValues.has(frequency) ||
      !validIsoDate(startDate) ||
      [row.next_due_date, row.balloon_date, row.ledger_opening_date].some(
        (date) => date && !validIsoDate(date),
      )
    )
      throw new Error(
        `Invalid payment frequency or date for ${row.account_name}.`,
      );
  }

  function accountTermFields(row) {
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
    return { term, graceDays };
  }

  function accountPropertyKind(row) {
    const propertyKind = row.property_kind || defaults.propertyKind;
    if (!propertyKindValues.has(propertyKind))
      throw new Error(
        `Invalid property_kind “${row.property_kind}” for ${row.property_name}.`,
      );
    return propertyKind;
  }

  function accountScheduleFields(row, today) {
    const frequency = row.payment_frequency || defaults.paymentFrequency,
      startDate = row.start_date || today;
    validateAccountDates(row, frequency, startDate);
    const { term, graceDays } = accountTermFields(row);
    const propertyKind = accountPropertyKind(row);
    return { frequency, startDate, term, graceDays, propertyKind };
  }

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
    type,
    financial,
    schedule,
    lateFee,
    contact,
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

  function normalizeAccountRow(row, context) {
    const { type, key } = validateIdentity(row, context.identity);
    const financial = accountFinancialFields(row, type);
    const schedule = accountScheduleFields(row, context.today);
    const lateFee = csvMoney(row.late_fee, `${row.account_name} late fee`, {
      optional: true,
    });
    const contact = accountContactFields(row);
    context.identity.seenAccounts.add(key);
    return normalizedAccountRow(
      row,
      type,
      financial,
      schedule,
      lateFee,
      contact,
    );
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
