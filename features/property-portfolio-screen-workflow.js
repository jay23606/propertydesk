/* Compose Properties grid rendering with its quick-action event handlers. */
(() => {
  "use strict";

  function create(context) {
    const {
      $,
      state,
      esc,
      money,
      paymentFrequencyLabel,
      monthlyScheduledEstimate,
      accountBalance,
      amountDueSince,
      unpaidDueAccrualStart,
      todayIso,
      propertyAddress,
      streetAddress,
      monthStart,
      dateOnly,
      monthEnd,
      lateReminderMailto,
      paymentStatusInMonth,
      toast,
      fetchAll,
      openPayment,
      openPropertyDetails,
      openAccountForProperty,
    } = context;
    const { renderProperties, attachEvents: attachPortfolioEvents } =
      window.PropertyDeskPropertyPortfolioWorkflow.create({
        $,
        state,
        esc,
        money,
        paymentFrequencyLabel,
        monthlyScheduledEstimate,
        accountBalance,
        amountDueSince,
        unpaidDueAccrualStart,
        todayIso,
        propertyAddress,
        streetAddress,
        monthStart,
        dateOnly,
        monthEnd,
        lateReminderMailto,
        paymentStatusInMonth,
      });
    const { attachEvents: attachPortfolioActionEvents } =
      window.PropertyDeskPropertyPortfolioActionsWorkflow.create({
        $,
        state,
        toast,
        fetchAll,
        streetAddress,
        openPayment,
        openPropertyDetails,
        openAccountForProperty,
      });

    function attachEvents() {
      attachPortfolioEvents();
      attachPortfolioActionEvents();
    }

    return {
      renderProperties,
      attachEvents,
    };
  }

  window.PropertyDeskPropertyPortfolioScreenWorkflow = Object.freeze({
    create,
  });
})();
