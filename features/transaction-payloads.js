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

  function buildPaymentCorrection(payload) {
    return {
      account_id: payload.account_id,
      amount: payload.amount,
      received_date: payload.received_date,
      payment_method: payload.payment_method,
      income_category: payload.income_category,
      principal_amount: payload.principal_amount,
      interest_amount: payload.interest_amount,
      fee_amount: payload.fee_amount,
      escrow_amount: payload.escrow_amount,
      unapplied_amount: payload.unapplied_amount,
      memo: payload.memo,
    };
  }

  function buildExpenseCorrection(payload) {
    return {
      property_id: payload.property_id,
      account_id: payload.account_id,
      amount: payload.amount,
      expense_date: payload.expense_date,
      category: payload.category,
      payee: payload.payee,
      payment_method: payload.payment_method,
      memo: payload.memo,
    };
  }

  window.PropertyDeskTransactionPayloads = Object.freeze({
    buildPayment: buildPaymentPayload,
    buildExpense: buildExpensePayload,
    buildPaymentCorrection,
    buildExpenseCorrection,
  });
})();
