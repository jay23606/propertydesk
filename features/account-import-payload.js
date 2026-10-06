/* Map validated account CSV rows to the database import shape. */
(() => {
  "use strict";

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
      party_name: row.party_name || null,
      party_email: row.party_email || null,
      party_phone: row.party_phone || null,
      start_date: row.start_date,
      next_due_date: row.next_due_date || null,
      payment_amount: row.payment_amount,
      payment_frequency: row.payment_frequency,
      original_principal: row.original_principal,
      principal_interest_amount: row.principal_interest_amount,
      escrow_amount: row.escrow_amount,
      ledger_opening_balance: row.ledger_opening_balance,
      ledger_opening_date: row.ledger_opening_date || null,
      interest_rate: row.interest_rate,
      term_months: row.term_months ? Number(row.term_months) : null,
      balloon_date: row.balloon_date || null,
      late_fee: row.late_fee,
      grace_days: row.grace_days,
      notes: row.notes || null,
    }));
  }

  window.PropertyDeskAccountImportPayload = Object.freeze({
    build: buildAccountImportPayloads,
  });
})();
