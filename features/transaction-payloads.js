/* Map manual payment and expense values to persisted ledger records. */
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

  function buildExpensePayload(values) {
    return {
      user_id: values.ownerId,
      property_id: values.propertyId,
      account_id: values.accountId || null,
      amount: values.amount,
      expense_date: values.expenseDate,
      category: values.category,
      payee: values.payee || null,
      payment_method: values.paymentMethod,
      memo: values.memo || null,
      source_type: "manual",
    };
  }

  window.PropertyDeskTransactionPayloads = Object.freeze({
    buildPayment: buildPaymentPayload,
    buildExpense: buildExpensePayload,
  });
})();
