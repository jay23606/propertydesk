/* Property expense and security-deposit refund entry and correction workflow. */
(() => {
  "use strict";

  function createExpenseEntryForm(context) {
    const {
      $,
      state,
      moneyInput,
      todayIso,
      toast,
      closeModal,
      fetchAll,
      saveCorrection,
      buildExpensePayload,
    } = context;
    const expenseView = window.PropertyDeskExpenseEntryView.create(context);

    async function saveExpense(event) {
      event.preventDefault();
      const addAnother = event.submitter?.id === "expense-save-next";
      const propertyId = $("expense-property").value;
      const accountId = $("expense-account").value;
      const category = $("expense-category").value;
      const payee = $("expense-payee").value.trim();
      const method = $("expense-method").value;
      const account = state.accounts.find((item) => item.id === accountId);
      if (category === "deposit_refund" && account?.account_type !== "rental") {
        toast("Choose a rental account for a security deposit refund");
        return;
      }

      const payload = buildExpensePayload({
        ownerId: state.workspaceOwnerId,
        propertyId,
        accountId,
        amount: moneyInput($("expense-amount").value),
        expenseDate: $("expense-date").value,
        category,
        payee,
        paymentMethod: method,
        memo: $("expense-memo").value.trim(),
      });
      if (state.pendingCorrection?.kind === "expense") {
        await saveCorrection("expense", {
          property_id: payload.property_id,
          account_id: payload.account_id,
          amount: payload.amount,
          expense_date: payload.expense_date,
          category: payload.category,
          payee: payload.payee,
          payment_method: payload.payment_method,
          memo: payload.memo,
        });
        return;
      }

      let error;
      try {
        ({ error } = await state.client.from("pd_expenses").insert(payload));
      } catch {
        toast(
          "Expense couldn't be saved right now. Check your connection and try again.",
        );
        return;
      }
      if (error) {
        toast(error.message);
        return;
      }
      $("expense-form").reset();
      $("expense-date").value = todayIso();
      try {
        await fetchAll();
      } catch {
        return;
      }
      if (addAnother) {
        $("expense-property").value = propertyId;
        $("expense-property").dispatchEvent(new Event("change"));
        $("expense-account").value = accountId;
        $("expense-category").value = category;
        $("expense-payee").value = payee;
        $("expense-method").value = method;
        $("expense-amount").focus();
        toast("Expense recorded. Ready for the next entry");
        return;
      }
      closeModal($("expense-modal"));
      toast("Expense recorded");
    }

    function attachEvents() {
      $("expense-form").addEventListener("submit", saveExpense);
      expenseView.attachEvents();
    }

    return { ...expenseView, attachEvents };
  }

  window.PropertyDeskExpenseEntryForm = Object.freeze({
    create: createExpenseEntryForm,
  });
})();
