/* Connect current account records and reminder helpers to the email preview. */
(() => {
  "use strict";

  function createReminderPreviewSetup({ records, ui, services, workflows }) {
    return workflows.previewWorkflow.create({
      $: ui.$,
      getProperty: (propertyId) => {
        const property = records
          .getProperties()
          .find((item) => item.id === propertyId);
        if (!property) return null;
        const {
          id,
          address,
          city,
          state: propertyState,
          postal_code,
        } = property;
        return { id, address, city, state: propertyState, postal_code };
      },
      getPaymentsForAccount: (accountId) =>
        records
          .getPayments()
          .filter((payment) => payment.account_id === accountId)
          .map(
            ({
              account_id,
              received_date,
              amount,
              status,
              income_category,
            }) => ({
              account_id,
              received_date,
              amount,
              status,
              income_category,
            }),
          ),
      paymentReminderMessage: services.paymentReminderMessage,
      amountDueSince: services.amountDueSince,
      unpaidDueAccrualStart: services.unpaidDueAccrualStart,
      monthEnd: ui.monthEnd,
      dateOnly: ui.dateOnly,
      monthStart: ui.monthStart,
      propertyAddress: ui.propertyAddress,
      money: ui.money,
      todayIso: ui.todayIso,
      moneyInput: ui.moneyInput,
      toast: ui.toast,
      esc: ui.esc,
      openModal: ui.openModal,
      splitEmailAddresses: services.splitEmailAddresses,
      workflows: {
        model: workflows.model,
        preview: workflows.preview,
      },
    });
  }

  window.PropertyDeskReminderPreviewSetup = Object.freeze({
    create: createReminderPreviewSetup,
  });
})();
