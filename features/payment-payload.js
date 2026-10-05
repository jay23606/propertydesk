/* Build manual receipt records without estimating principal or interest splits. */
(() => {
  "use strict";

  function buildPaymentPayload(values) {
    const isRental = values.account.account_type === "rental";
    return {
      user_id: values.ownerId,
      account_id: values.account.id,
      amount: values.amount,
      received_date: values.receivedDate,
      payment_method: values.paymentMethod,
      income_category: isRental ? values.incomeCategory : "installment",
      principal_amount: 0,
      interest_amount: 0,
      fee_amount: 0,
      escrow_amount: 0,
      unapplied_amount: isRental ? 0 : values.amount,
      memo: values.memo || null,
      source_type: "manual",
    };
  }

  window.PropertyDeskPaymentPayload = Object.freeze({ build: buildPaymentPayload });
})();
