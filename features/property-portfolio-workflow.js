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
    saveAndRefreshWorkspaceRecord,
    promptAction,
    openPayment,
    openPropertyDetails,
    openAccountForProperty,
    editAccount,
    propertyRepository,
    openModal,
    workflows,
  }) {
    const portfolioTable = workflows.table.create({
      esc,
      money,
      paymentFrequencyLabel,
      isActiveAccount,
    });
    const reminderTemplates = workflows.templateSettings.create({
      $,
      openModal,
      toast,
      onChange: () => propertyViews.renderProperties(),
    });
    const reminderModel = workflows.reminderModel.create({
      state,
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
    });
    const propertyViews = workflows.views.create({
      $,
      state,
      esc,
      portfolioTable,
      portfolioModel,
      exportPDF: propertyPdfExport.exportPDF,
      openEmailTemplateSettings: () => reminderTemplates.openEditor("email"),
      openSmsTemplateSettings: () => reminderTemplates.openEditor("sms"),
      attachTemplateEvents: reminderTemplates.attachEvents,
    });
    const { editPropertyQuickNote } = workflows.quickNote.create({
      state,
      toast,
      fetchAll,
      promptAction,
      streetAddress,
      repository: propertyRepository,
      saveAndRefreshWorkspaceRecord,
      noteMaintenance: workflows.noteMaintenance,
      recordUpdateMaintenance: workflows.recordUpdateMaintenance,
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
