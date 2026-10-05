/* PropertyDesk account lifecycle and ledger adjustment workflows. */
(() => {
  "use strict";

  function create({
    $,
    state,
    moneyInput,
    todayIso,
    toast,
    fetchAll,
    closeModal,
    openAccountDetails,
    confirmAction = (message) => window.confirm(message),
    promptAction = (message, initialValue) =>
      window.prompt(message, initialValue),
    prettyType,
    openPayment,
    openExpense,
    updateAllocationPreview,
    timestamp = () => new Date().toISOString(),
  }) {
    async function recordDepositAdjustment(accountId, type) {
      const account = state.accounts.find((row) => row.id === accountId);
      if (!account || account.account_type !== "rental") return;
      const action =
        type === "retained"
          ? "retained from the deposit"
          : "restored to the held balance";
      const amount = moneyInput(promptAction(`Amount ${action}?`, "0.00"));
      if (amount <= 0) {
        toast("Enter an amount greater than zero");
        return;
      }
      const reason = promptAction("Add a reason for the deposit ledger:");
      if (reason === null) return;
      if (!reason.trim()) {
        toast("Enter a reason so this adjustment can be audited");
        return;
      }
      const { error } = await state.client.from("pd_deposit_entries").insert({
        user_id: state.workspaceOwnerId,
        account_id: accountId,
        entry_type: type,
        amount,
        movement_date: todayIso(),
        reason: reason.trim(),
      });
      if (error) {
        toast(`Deposit adjustment failed: ${error.message}`);
        return;
      }
      await fetchAll();
      await openAccountDetails(accountId);
      toast(
        type === "retained"
          ? "Deposit retention recorded"
          : "Deposit retention reversed",
      );
    }

    async function deleteAccount(account) {
      if (
        !confirmAction(
          `Close “${account.name}”? Its payment history will remain in your records.`,
        )
      )
        return;
      const { error } = await state.client
        .from("pd_accounts")
        .update({ status: "closed" })
        .eq("id", account.id);
      if (error) {
        toast(error.message);
        return;
      }
      closeModal($("detail-modal"));
      await fetchAll();
      toast("Account closed");
    }

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
            new Option(
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
      $("expense-property").dispatchEvent(new Event("change"));
      $("expense-account").value = expense.account_id || "";
      $("expense-amount").value = expense.amount;
      $("expense-date").value = expense.expense_date;
      $("expense-category").value = expense.category;
      $("expense-category").dispatchEvent(new Event("change"));
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

    async function voidTransaction(kind, id) {
      const table = kind === "income" ? "pd_payments" : "pd_expenses";
      const label = kind === "income" ? "income entry" : "expense";
      if (
        !confirmAction(
          `Void this ${label}? It will remain in the audit history but stop affecting balances and reports.`,
        )
      )
        return;
      const reason = promptAction(
        "Optional reason for the audit record:",
        "Entered in error",
      );
      if (reason === null) return;
      const { data, error } = await state.client
        .from(table)
        .update({
          status: "voided",
          voided_at: timestamp(),
          void_reason: reason.trim() || "Voided by owner",
        })
        .eq("id", id)
        .eq("status", "posted")
        .select("id")
        .maybeSingle();
      if (error) {
        toast(error.message);
        return;
      }
      if (!data) {
        toast("This transaction was already voided or is no longer available.");
        return;
      }
      await fetchAll();
      toast("Transaction voided; original entry preserved");
    }

    return {
      recordDepositAdjustment,
      deleteAccount,
      correctTransaction,
      voidTransaction,
    };
  }

  window.PropertyDeskLedgerActions = { create };
})();
