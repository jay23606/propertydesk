/* Map validated account form values to the persisted account record. */
(() => {
  "use strict";

  function accountLoanFields(values, moneyInput) {
    if (values.accountType === "rental") {
      return {
        original_principal: 0,
        principal_interest_amount: null,
        escrow_amount: 0,
        balance_adjustment: 0,
        interest_rate: 0,
        term_months: null,
        balloon_date: null,
      };
    }

    return {
      original_principal: moneyInput(values.originalPrincipal),
      principal_interest_amount: values.principalInterestAmount
        ? moneyInput(values.principalInterestAmount)
        : null,
      escrow_amount: moneyInput(values.escrowAmount),
      balance_adjustment: moneyInput(values.balanceAdjustment),
      interest_rate: Number(values.interestRate || 0),
      term_months: values.termMonths ? Number(values.termMonths) : null,
      balloon_date: values.balloonDate || null,
    };
  }

  function accountPartyFields(values) {
    return {
      party_name: values.partyName || null,
      party_email: values.partyEmails.join(", ") || null,
      party_phone: values.partyPhone || null,
      monthly_reminder_enabled: values.reminderEnabled,
    };
  }

  function buildAccountPayload(values, moneyInput) {
    return {
      user_id: values.ownerId,
      property_id: values.propertyId,
      account_type: values.accountType,
      name: values.name,
      ...accountPartyFields(values),
      start_date: values.startDate,
      next_due_date: values.nextDueDate || null,
      payment_amount: moneyInput(values.paymentAmount),
      payment_frequency: values.paymentFrequency,
      ...accountLoanFields(values, moneyInput),
      agreement_effective_date: values.agreementEffectiveDate || null,
      agreement_change_reason: values.agreementChangeReason || null,
      late_fee: moneyInput(values.lateFee),
      grace_days: Number(values.graceDays || 0),
      notes: values.notes || null,
    };
  }

  window.PropertyDeskAccountPayload = Object.freeze({
    build: buildAccountPayload,
  });
})();
