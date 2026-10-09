/* Installment and rent receipt entry and correction workflow. */
(() => {
  "use strict";

  function createPaymentEntryForm({
    $,
    getAccounts,
    getWorkspaceOwnerId,
    setPendingCorrection,
    toast,
    saveTransactionEntry,
    insertPayment,
    buildPaymentPayload,
    buildPaymentCorrection,
    moneyInput,
    todayIso,
    fillSelect,
    populateFormOptions,
    prettyType,
    openModal,
    workflows,
  }) {
    const paymentView = workflows.view.create({
      $,
      getAccounts,
      setPendingCorrection,
      moneyInput,
      todayIso,
      fillSelect,
      populateFormOptions,
      prettyType,
      openModal,
    });
    const { openPropertyPayment } = workflows.propertyPaymentAction.create({
      getAccounts,
      toast,
      openPayment: paymentView.openPayment,
    });

    async function savePayment(event) {
      event.preventDefault();
      const {
        accountId,
        amount,
        receivedDate,
        paymentMethod,
        incomeCategory,
        memo,
      } = paymentView.readValues();
      const account = getAccounts().find((item) => item.id === accountId);
      if (!account || !amount) return;

      const payload = buildPaymentPayload({
        ownerId: getWorkspaceOwnerId(),
        account,
        amount,
        receivedDate,
        paymentMethod,
        incomeCategory,
        memo,
      });

      await saveTransactionEntry({
        kind: "payment",
        event,
        payload,
        buildCorrection: buildPaymentCorrection,
        insert: insertPayment,
        failureMessage:
          "Payment result couldn't be confirmed. Reload the Properties or Transactions list before recording it again.",
        label: "Payment",
        modalId: "payment-modal",
        resetAfterSave: () => paymentView.resetAfterSave(account.id),
        prepareNext: paymentView.prepareNextPayment,
      });
    }

    function attachEvents() {
      $("payment-form").addEventListener("submit", savePayment);
      paymentView.attachEvents();
    }

    return Object.freeze({
      updatePaymentGuidance: paymentView.updatePaymentGuidance,
      openPayment: paymentView.openPayment,
      openPropertyPayment,
      attachEvents,
    });
  }

  window.PropertyDeskPaymentEntryForm = Object.freeze({
    create: createPaymentEntryForm,
  });
})();
