/* Property expense and security-deposit refund entry and correction workflow. */
(() => {
  "use strict";

  function createExpenseEntryForm(context) {
    const {
      $,
      state,
      toast,
      saveCorrection,
      finishSuccessfulEntry,
      insertTransaction,
      buildExpensePayload,
      buildExpenseCorrection,
      moneyInput,
      todayIso,
      fillSelect,
      populateFormOptions,
      prettyType,
      openModal,
    } = context;
    const expenseView = window.PropertyDeskExpenseEntryView.create({
      $,
      state,
      moneyInput,
      todayIso,
      fillSelect,
      populateFormOptions,
      prettyType,
      openModal,
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
      if (
        !window.PropertyDeskExpenseAccountPolicy.accountMatchesCategory(
          category,
          account,
        )
      ) {
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
        await saveCorrection("expense", buildExpenseCorrection(payload));
        return;
      }

      const saved = await insertTransaction({
        table: "pd_expenses",
        payload,
        failureMessage:
          "Expense couldn't be saved right now. Check your connection and try again.",
      });
      if (!saved) return;
      await finishSuccessfulEntry({
        label: "Expense",
        addAnother,
        modalId: "expense-modal",
        resetAfterSave: expenseView.resetAfterSave,
        prepareNext: expenseView.prepareNextExpense,
        nextArguments: [
          { propertyId, accountId, category, payee, paymentMethod },
        ],
      });
    }

    function attachEvents() {
      $("expense-form").addEventListener("submit", saveExpense);
      expenseView.attachEvents();
    }

    return {
      openExpense: expenseView.openExpense,
      attachEvents,
    };
  }

  window.PropertyDeskExpenseEntryForm = Object.freeze({
    create: createExpenseEntryForm,
  });
})();
