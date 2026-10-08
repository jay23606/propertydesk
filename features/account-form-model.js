/* Normalize and validate account-party contact fields before saving. */
(() => {
  "use strict";

  function createAccountFormModel({
    splitEmailAddresses,
    isValidEmailAddress,
  }) {
    function partyEmails(value, reminderEnabled) {
      const emails = splitEmailAddresses(value);
      if (emails.some((email) => !isValidEmailAddress(email))) {
        return { emails, error: "Check each tenant/buyer email address." };
      }
      if (reminderEnabled && !emails.length) {
        return {
          emails,
          error:
            "Add at least one tenant/buyer email before enabling reminders.",
        };
      }
      return { emails, error: "" };
    }

    function payloadValuesFromForm(form, ownerId, partyEmails) {
      return {
        ownerId,
        propertyId: form.propertyId,
        accountType: form.type,
        name: form.name,
        partyName: form.partyName,
        partyEmails,
        partyPhone: form.partyPhone,
        reminderEnabled: form.reminderEnabled,
        startDate: form.startDate,
        nextDueDate: form.nextDueDate,
        paymentAmount: form.paymentAmount,
        paymentFrequency: form.paymentFrequency,
        originalPrincipal: form.originalPrincipal,
        principalInterestAmount: form.principalInterestAmount,
        escrowAmount: form.escrowAmount,
        balanceAdjustment: form.balanceAdjustment,
        interestRate: form.interestRate,
        termMonths: form.termMonths,
        balloonDate: form.balloonDate,
        agreementEffectiveDate: form.agreementEffectiveDate,
        agreementChangeReason: form.agreementChangeReason,
        lateFee: form.lateFee,
        graceDays: form.graceDays,
        notes: form.notes,
      };
    }

    return Object.freeze({ partyEmails, payloadValuesFromForm });
  }

  window.PropertyDeskAccountFormModel = Object.freeze({
    create: createAccountFormModel,
  });
})();
