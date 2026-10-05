/* Installment and rent receipt entry and correction workflow. */
(() => {
  "use strict";

  function createPaymentEntryForm(context) {
    const {
      $,
      state,
      moneyInput,
      todayIso,
      toast,
      closeModal,
      fetchAll,
      saveCorrection,
      buildPaymentPayload,
    } = context;
    const paymentView = window.PropertyDeskPaymentEntryView.create(context);

    async function savePayment(event) {
      event.preventDefault();
      const addAnother = event.submitter?.id === "payment-save-next";
      const account = state.accounts.find(
        (item) => item.id === $("payment-account").value,
      );
      const amount = moneyInput($("payment-amount").value);
      if (!account || !amount) return;

      const payload = buildPaymentPayload({
        ownerId: state.workspaceOwnerId,
        account,
        amount,
        receivedDate: $("payment-date").value,
        paymentMethod: $("payment-method").value,
        incomeCategory: $("income-category").value,
        memo: $("payment-memo").value.trim(),
      });

      if (state.pendingCorrection?.kind === "payment") {
        await saveCorrection("payment", {
          account_id: payload.account_id,
          amount: payload.amount,
          received_date: payload.received_date,
          payment_method: payload.payment_method,
          income_category: payload.income_category,
          principal_amount: payload.principal_amount,
          interest_amount: payload.interest_amount,
          fee_amount: payload.fee_amount,
          escrow_amount: payload.escrow_amount,
          unapplied_amount: payload.unapplied_amount,
          memo: payload.memo,
        });
        return;
      }

      let error;
      try {
        ({ error } = await state.client.from("pd_payments").insert(payload));
      } catch {
        toast(
          "Payment couldn't be saved right now. Check your connection and try again.",
        );
        return;
      }
      if (error) {
        toast(error.message);
        return;
      }
      $("payment-form").reset();
      $("payment-date").value = todayIso();
      $("payment-account").value = account.id;
      try {
        await fetchAll();
      } catch {
        return;
      }
      if (addAnother) {
        paymentView.updateAllocationPreview();
        $("payment-amount").focus();
        toast("Payment recorded. Ready for the next entry");
        return;
      }
      closeModal($("payment-modal"));
      toast("Payment recorded");
    }

    function attachEvents() {
      $("payment-form").addEventListener("submit", savePayment);
      paymentView.attachEvents();
    }

    return {
      savePayment,
      ...paymentView,
      attachEvents,
    };
  }

  window.PropertyDeskPaymentEntryForm = Object.freeze({
    create: createPaymentEntryForm,
  });
})();
