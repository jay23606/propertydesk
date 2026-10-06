/* Compose the Properties table, filter model, and read-only grid view. */
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
      monthStart,
      streetAddress,
      dateOnly,
      monthEnd,
      lateReminderMailto,
      paymentStatusInMonth,
    } = context;
    const portfolioTable = window.PropertyDeskPropertyPortfolioTable.create({
      esc,
      money,
      paymentFrequencyLabel,
    });
    const accountRowModel =
      window.PropertyDeskPropertyPortfolioAccountRowModel.create({
        state,
        monthlyScheduledEstimate,
        accountBalance,
        amountDueSince,
        unpaidDueAccrualStart,
        todayIso,
        propertyAddress,
        monthStart,
        dateOnly,
        monthEnd,
        lateReminderMailto,
        paymentStatusInMonth,
        money,
      });
    const portfolioModel = window.PropertyDeskPropertyPortfolioModel.create({
      state,
      accountRowModel,
      propertyAddress,
      streetAddress,
    });
    return window.PropertyDeskPropertyViews.create({
      $,
      state,
      esc,
      portfolioTable,
      portfolioModel,
    });
  }

  window.PropertyDeskPropertyPortfolioWorkflow = Object.freeze({ create });
})();
