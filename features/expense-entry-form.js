/* Property expense and security-deposit refund entry and correction workflow. */
(() => {
  "use strict";

  function createExpenseEntryForm(context) {
    const {
      $,
      state,
      toast,
      closeModal,
      fetchAll,
      saveCorrection,
      buildExpensePayload,
    } = context;
    const expenseView = window.PropertyDeskExpenseEntryView.create({
      $,
      state,
      moneyInput: context.moneyInput,
      todayIso: context.todayIso,
      fillSelect: context.fillSelect,
      populateFormOptions: context.populateFormOptions,
      prettyType: context.prettyType,
      openModal: context.openModal,
    });

    async function saveExpense(event) {
      event.preventDefault();
      const addAnother = event.submitter?.id === "expense-save-next";
      const {
        propertyId,
        accountId,
        amount,
        expenseDate,
        category,
        payee,
        paymentMethod,
        memo,
      } = expenseView.readValues();
      const account = state.accounts.find((item) => item.id === accountId);
      if (category === "deposit_refund" && account?.account_type !== "rental") {
        toast("Choose a rental account for a security deposit refund");
        return;
      }

      const payload = buildExpensePayload({
        ownerId: state.workspaceOwnerId,
        propertyId,
        accountId,
        amount,
        expenseDate,
        category,
        payee,
        paymentMethod,
        memo,
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
      expenseView.resetAfterSave();
      try {
        await fetchAll();
      } catch {
        return;
      }
      if (addAnother) {
        expenseView.prepareNextExpense({
          propertyId,
          accountId,
          category,
          payee,
          paymentMethod,
        });
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

    return {
      openExpense: expenseView.openExpense,
      prepareNextExpense: expenseView.prepareNextExpense,
      readValues: expenseView.readValues,
      resetAfterSave: expenseView.resetAfterSave,
      attachEvents,
    };
  }

  window.PropertyDeskExpenseEntryForm = Object.freeze({
    create: createExpenseEntryForm,
  });
})();
