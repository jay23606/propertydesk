/* Map validated account form values to the persisted account record. */
(() => {
  "use strict";

  function buildAccountPayload(values, moneyInput) {
    const isRental = values.accountType === "rental";
    return {
      user_id: values.ownerId,
      property_id: values.propertyId,
      account_type: values.accountType,
      name: values.name,
      party_name: values.partyName || null,
      party_email: values.partyEmails.join(", ") || null,
      party_phone: values.partyPhone || null,
      monthly_reminder_enabled: values.reminderEnabled,
      start_date: values.startDate,
      next_due_date: values.nextDueDate || null,
      payment_amount: moneyInput(values.paymentAmount),
      payment_frequency: values.paymentFrequency,
      original_principal: isRental ? 0 : moneyInput(values.originalPrincipal),
      principal_interest_amount:
        isRental || !values.principalInterestAmount
          ? null
          : moneyInput(values.principalInterestAmount),
      escrow_amount: isRental ? 0 : moneyInput(values.escrowAmount),
      balance_adjustment: isRental ? 0 : moneyInput(values.balanceAdjustment),
      interest_rate: isRental ? 0 : Number(values.interestRate || 0),
      term_months:
        isRental || !values.termMonths ? null : Number(values.termMonths),
      balloon_date: isRental ? null : values.balloonDate || null,
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
