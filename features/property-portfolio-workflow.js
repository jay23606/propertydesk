/* Compose the Properties grid model, view, and action routes. */
(() => {
  "use strict";

  function create({
    $,
    state,
    groupAccountsByProperty,
    isActiveAccount,
    esc,
    money,
    paymentFrequencyLabel,
    monthlyScheduledEstimate,
    summarizeAccount,
    amountDueSince,
    propertyAddress,
    streetAddress,
    monthStart,
    dateOnly,
    monthEnd,
    lateReminderMailto,
    lateReminderSms,
    paymentStatusInMonth,
    toast,
    fetchAll,
    writeFeedback,
    openPayment,
    openPropertyDetails,
    openAccountForProperty,
    editAccount,
    propertyRepository,
    workflows,
  }) {
    const portfolioTable = workflows.table.create({
      esc,
      money,
      paymentFrequencyLabel,
    });
    const reminderModel = workflows.reminderModel.create({
      state,
      propertyAddress,
      monthStart,
      dateOnly,
      monthEnd,
      lateReminderMailto,
      lateReminderSms,
      money,
    });
    const accountRowModel = workflows.accountRowModel.create({
      state,
      monthlyScheduledEstimate,
      summarizeAccount,
      amountDueSince,
      monthStart,
      monthEnd,
      paymentStatusInMonth,
      reminderModel,
    });
    const filterModel = workflows.filterModel.create({
      state,
      propertyAddress,
      isActiveAccount,
    });
    const portfolioModel = workflows.portfolioModel.create({
      state,
      accountRowModel,
      groupAccountsByProperty,
      streetAddress,
      filterModel,
    });
    const propertyViews = workflows.views.create({
      $,
      state,
      esc,
      portfolioTable,
      portfolioModel,
    });
    const { editPropertyQuickNote } = workflows.quickNote.create({
      state,
      toast,
      fetchAll,
      streetAddress,
      repository: propertyRepository,
      writeFeedback,
    });
    const { attachEvents: attachPropertyActionEvents } =
      workflows.events.create({
        $,
        openPayment,
        editPropertyQuickNote,
        openPropertyDetails,
        openAccountForProperty,
        state,
        editAccount,
      });

    return Object.freeze({
      renderProperties: propertyViews.renderProperties,
      attachPropertyGridEvents: propertyViews.attachEvents,
      attachPropertyActionEvents,
    });
  }

  window.PropertyDeskPropertyPortfolioWorkflow = Object.freeze({ create });
})();
