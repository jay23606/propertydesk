/* Property expense and security-deposit refund entry and correction workflow. */
(() => {
  "use strict";

  function createExpenseEntryForm(context) {
    const {
      $, state, moneyInput, todayIso, toast, closeModal, fetchAll,
      fillSelect, populateFormOptions, prettyType, openModal,
    } = context;

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

      const payload = {
        user_id: state.workspaceOwnerId,
        property_id: propertyId,
        account_id: accountId || null,
        amount: moneyInput($("expense-amount").value),
        expense_date: $("expense-date").value,
        category,
        payee: payee || null,
        payment_method: method,
        memo: $("expense-memo").value.trim() || null,
        source_type: "manual",
      };
      if (state.pendingCorrection?.kind === "expense") {
        const { error } = await state.client.rpc("pd_correct_transaction", {
          p_kind: "expense",
          p_transaction_id: state.pendingCorrection.id,
          p_correction: {
            property_id: payload.property_id,
            account_id: payload.account_id,
            amount: payload.amount,
            expense_date: payload.expense_date,
            category: payload.category,
            payee: payload.payee,
            payment_method: payload.payment_method,
            memo: payload.memo,
          },
          p_reason: state.pendingCorrection.reason,
        });
        if (error) {
          toast(`Correction failed; original entry is unchanged. ${error.message}`);
          return;
        }
        closeModal($("expense-modal"));
        await fetchAll();
        toast("Expense corrected; original kept in history");
        return;
      }

      const { error } = await state.client.from("pd_expenses").insert(payload);
      if (error) {
        toast(error.message);
        return;
      }
      $("expense-form").reset();
      $("expense-date").value = todayIso();
      await fetchAll();
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

    function openExpense(propertyId) {
      state.pendingCorrection = null;
      populateFormOptions();
      $("expense-form").reset();
      $("expense-modal-title").textContent = "Record expense";
      $("expense-modal").querySelector(".eyebrow").textContent = "PROPERTY EXPENSE";
      $("expense-save-button").textContent = "Save expense";
      $("expense-save-next").classList.remove("hidden");
      $("expense-date").value = todayIso();
      $("deposit-refund-hint").classList.add("hidden");
      if (propertyId) $("expense-property").value = propertyId;
      openModal("expense-modal");
    }

    function attachEvents() {
      $("expense-form").addEventListener("submit", saveExpense);
      $("expense-property").addEventListener("change", () => {
        const propertyId = $("expense-property").value;
        const relatedAccounts = state.accounts.filter(
          (account) => account.property_id === propertyId,
        );
        fillSelect(
          "expense-account",
          relatedAccounts.map((account) => ({
            value: account.id,
            label: `${account.name} — ${prettyType(account.account_type)}`,
          })),
          "Property level",
        );
      });
      $("expense-category").addEventListener("change", () => {
        $("deposit-refund-hint").classList.toggle(
          "hidden",
          $("expense-category").value !== "deposit_refund",
        );
      });
    }

    return { saveExpense, openExpense, attachEvents };
  }

  window.PropertyDeskExpenseEntryForm = Object.freeze({ create: createExpenseEntryForm });
})();
