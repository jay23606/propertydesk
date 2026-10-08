/* Map validated account CSV rows to the database import shape. */
(() => {
  "use strict";

  function nullableValue(value) {
    return value || null;
  }

  function nullableNumber(value) {
    return value ? Number(value) : null;
  }

  function buildAccountImportPayloads(rows) {
    return rows.map((row) => ({
      property_name: row.property_name,
      property_address: row.property_address,
      city: row.city,
      state: row.state,
      postal_code: row.postal_code,
      property_kind: row.property_kind,
      account_type: row.account_type,
      account_name: row.account_name,
      party_name: nullableValue(row.party_name),
      party_email: nullableValue(row.party_email),
      party_phone: nullableValue(row.party_phone),
      start_date: row.start_date,
      next_due_date: nullableValue(row.next_due_date),
      payment_amount: row.payment_amount,
      payment_frequency: row.payment_frequency,
      original_principal: row.original_principal,
      principal_interest_amount: row.principal_interest_amount,
      escrow_amount: row.escrow_amount,
      ledger_opening_balance: row.ledger_opening_balance,
      ledger_opening_date: nullableValue(row.ledger_opening_date),
      interest_rate: row.interest_rate,
      term_months: nullableNumber(row.term_months),
      balloon_date: nullableValue(row.balloon_date),
      late_fee: row.late_fee,
      grace_days: row.grace_days,
      notes: nullableValue(row.notes),
    }));
  }

  window.PropertyDeskAccountImportPayload = Object.freeze({
    build: buildAccountImportPayloads,
  });
})();
