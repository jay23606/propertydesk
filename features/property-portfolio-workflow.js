/* Compose the Properties table, filter model, and grid action routers. */
(() => {
  "use strict";

  function create(context) {
    const {
      $, state, esc, money, paymentFrequencyLabel, monthlyScheduledEstimate,
      accountBalance, amountDueSince, unpaidDueAccrualStart, todayIso,
      propertyAddress, monthStart, streetAddress, dateOnly, monthEnd,
      lateReminderMailto, paymentStatusInMonth, openPayment,
      openPropertyDetails, resetAccountForm,
      populateFormOptions, openModal,
    } = context;
    const { editPropertyQuickNote } = window.PropertyDeskPropertyQuickNote.create({
      state: context.state,
      toast: context.toast,
      fetchAll: context.fetchAll,
      streetAddress,
    });
    const portfolioTable = window.PropertyDeskPropertyPortfolioTable.create({
      esc, money, paymentFrequencyLabel,
    });
    const portfolioModel = window.PropertyDeskPropertyPortfolioModel.create({
      state, monthlyScheduledEstimate, accountBalance, amountDueSince,
      unpaidDueAccrualStart, todayIso, propertyAddress, monthStart, streetAddress,
      dateOnly, monthEnd, lateReminderMailto, paymentStatusInMonth, money,
    });
    const {
      renderProperties,
      attachEvents: attachPropertyViewEvents,
    } = window.PropertyDeskPropertyViews.create({ $, state, esc, portfolioTable, portfolioModel });
    const { attachEvents: attachPropertyActionEvents } =
      window.PropertyDeskPropertyViewEvents.create({
        $, openPayment, editPropertyQuickNote, openPropertyDetails,
        resetAccountForm, populateFormOptions, openModal,
      });

    return {
      renderProperties,
      attachPropertyViewEvents,
      attachPropertyActionEvents,
    };
  }

  window.PropertyDeskPropertyPortfolioWorkflow = Object.freeze({ create });
})();
