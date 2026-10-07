/* Compose the Properties grid model, view, and action routes. */
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

    const portfolioTable = window.PropertyDeskPropertyPortfolioTable.create({
      esc,
      money,
      paymentFrequencyLabel,
    });
    const reminderModel =
      window.PropertyDeskPropertyPortfolioReminderModel.create({
        state,
        propertyAddress,
        monthStart,
        dateOnly,
        monthEnd,
        lateReminderMailto,
        money,
      });
    const accountRowModel =
      window.PropertyDeskPropertyPortfolioAccountRowModel.create({
        state,
        monthlyScheduledEstimate,
        accountBalance,
        amountDueSince,
        unpaidDueAccrualStart,
        todayIso,
        monthStart,
        monthEnd,
        paymentStatusInMonth,
        reminderModel,
      });
    const filterModel = window.PropertyDeskPropertyPortfolioFilterModel.create({
      state,
      propertyAddress,
    });
    const portfolioModel = window.PropertyDeskPropertyPortfolioModel.create({
      state,
      accountRowModel,
      streetAddress,
      filterModel,
    });
    const propertyViews = window.PropertyDeskPropertyViews.create({
      $,
      state,
      esc,
      portfolioTable,
      portfolioModel,
    });
    const { editPropertyQuickNote } =
      window.PropertyDeskPropertyQuickNote.create({
        state,
        toast,
        fetchAll,
        streetAddress,
      });
    const { attachEvents: attachPropertyActionEvents } =
      window.PropertyDeskPropertyViewEvents.create({
        $,
        openPayment,
        editPropertyQuickNote,
        openPropertyDetails,
        openAccountForProperty,
      });

    return {
      renderProperties: propertyViews.renderProperties,
      attachPropertyGridEvents: propertyViews.attachEvents,
      attachPropertyActionEvents,
    };
  }

  window.PropertyDeskPropertyPortfolioWorkflow = Object.freeze({ create });
})();
