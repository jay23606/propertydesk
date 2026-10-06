/* Installment and rent receipt entry and correction workflow. */
(() => {
  "use strict";

  function createPaymentEntryForm(context) {
    const {
      $,
      state,
      toast,
      closeModal,
      fetchAll,
      saveCorrection,
      buildPaymentPayload,
    } = context;
    const paymentView = window.PropertyDeskPaymentEntryView.create({
      $,
      state,
      moneyInput: context.moneyInput,
      todayIso: context.todayIso,
      toast,
      fillSelect: context.fillSelect,
      populateFormOptions: context.populateFormOptions,
      prettyType: context.prettyType,
      openModal: context.openModal,
    });

    async function savePayment(event) {
      event.preventDefault();
      const addAnother = event.submitter?.id === "payment-save-next";
      const {
        accountId,
        amount,
        receivedDate,
        paymentMethod,
        incomeCategory,
        memo,
      } = paymentView.readValues();
      const account = state.accounts.find((item) => item.id === accountId);
      if (!account || !amount) return;

      const payload = buildPaymentPayload({
        ownerId: state.workspaceOwnerId,
        account,
        amount,
        receivedDate,
        paymentMethod,
        incomeCategory,
        memo,
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
      paymentView.resetAfterSave(account.id);
      try {
        await fetchAll();
      } catch {
        return;
      }
      if (addAnother) {
        paymentView.prepareNextPayment();
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
      updateAllocationPreview: paymentView.updateAllocationPreview,
      readValues: paymentView.readValues,
      resetAfterSave: paymentView.resetAfterSave,
      prepareNextPayment: paymentView.prepareNextPayment,
      openPayment: paymentView.openPayment,
      openPropertyPayment: paymentView.openPropertyPayment,
      attachEvents,
    };
  }

  window.PropertyDeskPaymentEntryForm = Object.freeze({
    create: createPaymentEntryForm,
  });
})();
