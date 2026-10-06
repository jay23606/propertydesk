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
      insertTransaction,
      buildPaymentPayload,
      buildPaymentCorrection,
      moneyInput,
      todayIso,
      fillSelect,
      populateFormOptions,
      prettyType,
      openModal,
    } = context;
    const paymentView = window.PropertyDeskPaymentEntryView.create({
      $,
      state,
      moneyInput,
      todayIso,
      toast,
      fillSelect,
      populateFormOptions,
      prettyType,
      openModal,
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
        await saveCorrection("payment", buildPaymentCorrection(payload));
        return;
      }

      const saved = await insertTransaction({
        table: "pd_payments",
        payload,
        failureMessage:
          "Payment couldn't be saved right now. Check your connection and try again.",
      });
      if (!saved) return;
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
