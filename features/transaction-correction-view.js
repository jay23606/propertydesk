/* Populate payment and expense forms for transaction corrections. */
(() => {
  "use strict";

  function create({
    $,
    prettyType,
    updatePaymentGuidance,
    EventClass,
    OptionClass,
  }) {
    function populatePayment(payment, account) {
      const select = $("payment-account");
      if (
        account &&
        ![...select.options].some((option) => option.value === account.id)
      ) {
        select.add(
          new OptionClass(
            `${account.party_name || account.name} — ${prettyType(account.account_type)} (closed)`,
            account.id,
          ),
        );
      }
      select.value = payment.account_id;
      $("payment-amount").value = payment.amount;
      $("payment-date").value = payment.received_date;
      $("payment-method").value = payment.payment_method;
      $("income-category").value = payment.income_category;
      $("payment-memo").value = payment.memo || "";
      updatePaymentGuidance();
      $("payment-modal-title").textContent = "Correct payment";
      $("payment-modal").querySelector(".eyebrow").textContent =
        "TRANSACTION CORRECTION";
      $("payment-save-button").textContent = "Save correction";
      $("payment-save-next").classList.add("hidden");
    }

    function populateExpense(expense) {
      $("expense-property").value = expense.property_id;
      $("expense-property").dispatchEvent(new EventClass("change"));
      $("expense-account").value = expense.account_id || "";
      $("expense-amount").value = expense.amount;
      $("expense-date").value = expense.expense_date;
      $("expense-category").value = expense.category;
      $("expense-category").dispatchEvent(new EventClass("change"));
      $("expense-payee").value = expense.payee || "";
      $("expense-method").value = expense.payment_method;
      $("expense-memo").value = expense.memo || "";
      $("expense-modal-title").textContent = "Correct expense";
      $("expense-modal").querySelector(".eyebrow").textContent =
        "TRANSACTION CORRECTION";
      $("expense-save-button").textContent = "Save correction";
      $("expense-save-next").classList.add("hidden");
    }

    return Object.freeze({ populatePayment, populateExpense });
  }

  window.PropertyDeskTransactionCorrectionView = Object.freeze({ create });
})();
