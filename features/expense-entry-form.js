/* Property expense and security-deposit refund entry and correction workflow. */
(() => {
  "use strict";

  function createExpenseEntryForm({
    $,
    state,
    toast,
    saveTransactionEntry,
    insertExpense,
    buildExpensePayload,
    buildExpenseCorrection,
    moneyInput,
    todayIso,
    fillSelect,
    populateFormOptions,
    prettyType,
    openModal,
    expenseAccountPolicy,
  }) {
    const expenseView = window.PropertyDeskExpenseEntryView.create({
      $,
      state,
      moneyInput,
      todayIso,
      fillSelect,
      populateFormOptions,
      prettyType,
      openModal,
      expenseAccountPolicy,
    });

    async function saveExpense(event) {
      event.preventDefault();
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
      if (!expenseAccountPolicy.accountMatchesCategory(category, account)) {
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
      await saveTransactionEntry({
        kind: "expense",
        event,
        payload,
        buildCorrection: buildExpenseCorrection,
        insert: insertExpense,
        failureMessage:
          "Expense result couldn't be confirmed. Reload the Transactions list before recording it again.",
        label: "Expense",
        modalId: "expense-modal",
        resetAfterSave: expenseView.resetAfterSave,
        prepareNext: () =>
          expenseView.prepareNextExpense({
            propertyId,
            accountId,
            category,
            payee,
            paymentMethod,
          }),
      });
    }

    function attachEvents() {
      $("expense-form").addEventListener("submit", saveExpense);
      expenseView.attachEvents();
    }

    return Object.freeze({
      openExpense: expenseView.openExpense,
      attachEvents,
    });
  }

  window.PropertyDeskExpenseEntryForm = Object.freeze({
    create: createExpenseEntryForm,
  });
})();
