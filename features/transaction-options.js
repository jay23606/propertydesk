/* Shared transaction categories and methods for forms, imports, and labels. */
(() => {
  "use strict";

  const freezeOptions = (options) =>
    Object.freeze(options.map((option) => Object.freeze(option)));
  const incomeCategories = Object.freeze({
    rental: freezeOptions([
      { value: "rent", label: "Rent" },
      { value: "late_fee", label: "Late fee" },
      { value: "deposit", label: "Deposit" },
      { value: "other", label: "Other income" },
    ]),
    loan: freezeOptions([
      { value: "installment", label: "Installment" },
      { value: "late_fee", label: "Late fee" },
      { value: "other", label: "Other income" },
    ]),
  });
  const paymentMethods = freezeOptions([
    { value: "manual", label: "Manual / other" },
    { value: "check", label: "Check" },
    { value: "cash", label: "Cash" },
    { value: "bank_transfer", label: "Bank transfer" },
    { value: "money_order", label: "Money order" },
    { value: "card", label: "Card" },
  ]);
  const expensePaymentMethods = freezeOptions([
    ...paymentMethods.filter(({ value }) => value !== "money_order"),
    { value: "other", label: "Other", formVisible: false },
  ]);
  const expenseCategories = freezeOptions([
    { value: "repairs", label: "Repairs" },
    { value: "contractor", label: "Contractor labor" },
    { value: "materials", label: "Materials" },
    { value: "taxes", label: "Taxes" },
    { value: "insurance", label: "Insurance" },
    { value: "utilities", label: "Utilities" },
    { value: "management", label: "Management" },
    { value: "deposit_refund", label: "Security deposit refund" },
    { value: "other", label: "Other" },
  ]);
  const transactionOptions = Object.freeze({
    incomeCategories,
    paymentMethods,
    expensePaymentMethods,
    expenseCategories,
    defaults: Object.freeze({
      paymentMethod: paymentMethods[0].value,
      expensePaymentMethod: expensePaymentMethods[0].value,
      expenseImportCategory: "other",
    }),
  });

  const target = typeof window === "undefined" ? globalThis : window;
  target.PropertyDeskTransactionOptions = transactionOptions;
  if (typeof module !== "undefined" && module.exports)
    module.exports = transactionOptions;
})();
