/* Build manual property expense records from validated entry values. */
(() => {
  "use strict";

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

  window.PropertyDeskExpensePayload = Object.freeze({ build: buildExpensePayload });
})();
