/* Populate payment and expense forms for an audited transaction correction. */
(() => {
  "use strict";

  function create({
    $,
    state,
    toast,
    confirmAction = (message) => window.confirm(message),
    promptAction = (message, initialValue) =>
      window.prompt(message, initialValue),
    prettyType,
    openPayment,
    openExpense,
    updateAllocationPreview,
    EventClass = Event,
    OptionClass = Option,
  }) {
    function correctTransaction(kind, id) {
      const payment =
          kind === "income"
            ? state.payments.find((item) => item.id === id)
            : null,
        expense =
          kind === "expense"
            ? state.expenses.find((item) => item.id === id)
            : null,
        item = payment || expense;
      if (!item || item.status !== "posted") {
        toast("Only posted transactions can be corrected");
        return;
      }

      const reason = promptAction(
        `Why are you correcting this ${kind === "income" ? "income entry" : "expense"}?`,
        "Entered in error",
      );
      if (reason === null) return;
      const auditReason = reason.trim() || "Corrected by owner";

      if (payment) {
        openPayment();
        const account = state.accounts.find(
            (accountItem) => accountItem.id === payment.account_id,
          ),
          select = $("payment-account");
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
        updateAllocationPreview();
        state.pendingCorrection = { kind: "payment", id, reason: auditReason };
        $("payment-modal-title").textContent = "Correct payment";
        $("payment-modal").querySelector(".eyebrow").textContent =
          "TRANSACTION CORRECTION";
        $("payment-save-button").textContent = "Save correction";
        $("payment-save-next").classList.add("hidden");
        return;
      }

      openExpense();
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
      state.pendingCorrection = { kind: "expense", id, reason: auditReason };
      $("expense-modal-title").textContent = "Correct expense";
      $("expense-modal").querySelector(".eyebrow").textContent =
        "TRANSACTION CORRECTION";
      $("expense-save-button").textContent = "Save correction";
      $("expense-save-next").classList.add("hidden");
    }

    return { correctTransaction };
  }

  window.PropertyDeskTransactionCorrectionForm = Object.freeze({ create });
})();
