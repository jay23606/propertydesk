/* Compose the Properties grid model, view, and action routes. */
(() => {
  "use strict";

  function create({
    $,
    getSenderName,
    getPayments,
    getPropertyHolders,
    getProperties,
    getAccounts,
    getWorkspaceMembers,
    editPropertyQuickNote,
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
    openWindow,
    schedule,
    openPayment,
    openPropertyDetails,
    openAccountForProperty,
    editAccount,
    openModal,
    workflows,
  }) {
    const portfolioTable = workflows.table.create({
      esc,
      money,
      paymentFrequencyLabel,
      isActiveAccount,
    });
    const reminderTemplateStore = workflows.templateStore.create({ toast });
    const reminderTemplates = workflows.templateSettings.create({
      $,
      openModal,
      toast,
      store: reminderTemplateStore,
      onChange: () => propertyViews.renderProperties(),
    });
    const reminderModel = workflows.reminderModel.create({
      getSenderName,
      propertyAddress,
      monthStart,
      dateOnly,
      monthEnd,
      lateReminderMailto,
      lateReminderSms,
      getEmailTemplate: () => reminderTemplates.getTemplate("email"),
      getSmsTemplate: () => reminderTemplates.getTemplate("sms"),
      money,
    });
    const accountRowModel = workflows.accountRowModel.create({
      getPayments,
      monthlyScheduledEstimate,
      summarizeAccount,
      amountDueSince,
      monthStart,
      monthEnd,
      paymentStatusInMonth,
      reminderModel,
    });
    const filterModel = workflows.filterModel.create({
      getPropertyHolders,
      propertyAddress,
      isActiveAccount,
    });
    const portfolioModel = workflows.portfolioModel.create({
      getProperties,
      getAccounts,
      accountRowModel,
      groupAccountsByProperty,
      streetAddress,
      filterModel,
    });
    const propertyPdfExport = workflows.pdfExport.create({
      $,
      getRows: () =>
        portfolioModel.buildRows({
          query: $("property-search").value.trim().toLowerCase(),
          type: $("property-filter").value,
          holderId: $("property-holder-filter").value,
          showArchived: $("show-archived").checked,
        }),
      propertyAddress,
      esc,
      money,
      toast,
      openWindow,
      schedule,
    });
    const propertyViews = workflows.views.create({
      $,
      getWorkspaceMembers,
      getProperties,
      esc,
      portfolioTable,
      portfolioModel,
      exportPDF: propertyPdfExport.exportPDF,
      openEmailTemplateSettings: () => reminderTemplates.openEditor("email"),
      openSmsTemplateSettings: () => reminderTemplates.openEditor("sms"),
      attachTemplateEvents: reminderTemplates.attachEvents,
    });
    const { attachEvents: attachPropertyActionEvents } =
      workflows.events.create({
        $,
        openPayment,
        editPropertyQuickNote,
        openPropertyDetails,
        openAccountForProperty,
        getAccount: (accountId) =>
          getAccounts().find((account) => String(account.id) === accountId) ||
          null,
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
