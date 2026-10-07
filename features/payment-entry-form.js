/* Installment and rent receipt entry and correction workflow. */
(() => {
  "use strict";

  function createPaymentEntryForm(context) {
    const {
      $,
      state,
      toast,
      saveCorrection,
      finishSuccessfulEntry,
      insertPayment,
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
      fillSelect,
      populateFormOptions,
      prettyType,
      openModal,
    });
    const { openPropertyPayment } =
      window.PropertyDeskPropertyPaymentAction.create({
        state,
        toast,
        openPayment: paymentView.openPayment,
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

      const saved = await insertPayment({
        payload,
        failureMessage:
          "Payment couldn't be saved right now. Check your connection and try again.",
      });
      if (!saved) return;
      await finishSuccessfulEntry({
        label: "Payment",
        addAnother,
        modalId: "payment-modal",
        resetAfterSave: paymentView.resetAfterSave,
        resetArguments: [account.id],
        prepareNext: paymentView.prepareNextPayment,
      });
    }

    function attachEvents() {
      $("payment-form").addEventListener("submit", savePayment);
      paymentView.attachEvents();
    }

    return {
      updatePaymentGuidance: paymentView.updatePaymentGuidance,
      openPayment: paymentView.openPayment,
      openPropertyPayment,
      attachEvents,
    };
  }

  window.PropertyDeskPaymentEntryForm = Object.freeze({
    create: createPaymentEntryForm,
  });
})();
