/* Collect the workflow modules owned by the property workspace. */
(() => {
  "use strict";

  function createPropertyWorkspaceModuleCatalog() {
    return Object.freeze({
      workspace: window.PropertyDeskPropertyWorkspaceWorkflow,
      detailContextSetup: window.PropertyDeskPropertyDetailContextSetup,
      groupAccountsByProperty:
        window.PropertyDeskPropertyAccountIndex.groupByProperty,
      isActiveAccount: window.PropertyDeskAccountStatusUtils.isActiveAccount,
      overview: window.PropertyDeskOverviewWorkflow,
      portfolio: window.PropertyDeskPropertyPortfolioWorkflow,
      documentWorkflow: window.PropertyDeskPropertyDocumentWorkflow,
      documents: window.PropertyDeskDocuments,
      documentEvents: window.PropertyDeskPropertyDetailDocumentEvents,
      screen: window.PropertyDeskPropertyScreenWorkflow,
      content: window.PropertyDeskPropertyDetailContentWorkflow,
      management: window.PropertyDeskPropertyDetailManagementWorkflow,
      holder: window.PropertyDeskPropertyHolderWorkflow,
      contentModules: {
        documentsView: window.PropertyDeskPropertyDocumentsView,
        accountTable: window.PropertyDeskPropertyDetailsAccountTable,
        detailsView: window.PropertyDeskPropertyDetailsView,
        activityDetails: window.PropertyDeskPropertyActivityDetails,
        activityModules: {
          transactions: window.PropertyDeskPropertyActivityTransactions,
          model: window.PropertyDeskPropertyActivityModel,
          view: window.PropertyDeskPropertyActivityView,
        },
        detailsModel: window.PropertyDeskPropertyDetailsModel,
        details: window.PropertyDeskPropertyDetails,
      },
      managementModules: {
        archive: window.PropertyDeskPropertyArchive,
        statusMaintenance: window.PropertyDeskPropertyStatusMaintenance,
        recordUpdateMaintenance:
          window.PropertyDeskPropertyRecordUpdateMaintenance,
        detailEvents: window.PropertyDeskPropertyDetailEvents,
        quickActions: window.PropertyDeskPropertyDetailQuickActions,
      },
      holderModules: {
        management: window.PropertyDeskPropertyHolderManagement,
        events: window.PropertyDeskPropertyHolderEvents,
      },
      documentModules: {
        upload: window.PropertyDeskDocumentUpload,
        uploadMaintenance: window.PropertyDeskDocumentUploadMaintenance,
        uploadPolicy: window.PropertyDeskDocumentUploadPolicy,
        actions: {
          create: window.PropertyDeskDocumentActions.create,
          modules: {
            delete: window.PropertyDeskDocumentDelete,
            deleteMaintenance: window.PropertyDeskDocumentDeleteMaintenance,
            open: window.PropertyDeskDocumentOpen,
          },
        },
      },
      overviewModules: {
        propertySummaryModel: window.PropertyDeskOverviewPropertySummaryModel,
        overviewModel: window.PropertyDeskOverviewModel,
        activityModel: window.PropertyDeskOverviewActivityModel,
        overview: window.PropertyDeskOverview,
        view: window.PropertyDeskOverviewView,
        events: window.PropertyDeskOverviewEvents,
      },
      portfolioModules: {
        table: window.PropertyDeskPropertyPortfolioTable,
        reminderModel: window.PropertyDeskPropertyPortfolioReminderModel,
        accountRowModel: window.PropertyDeskPropertyPortfolioAccountRowModel,
        filterModel: window.PropertyDeskPropertyPortfolioFilterModel,
        portfolioModel: window.PropertyDeskPropertyPortfolioModel,
        views: window.PropertyDeskPropertyViews,
        events: window.PropertyDeskPropertyViewEvents,
        pdfExport: window.PropertyDeskPropertyPdfExport,
        templateStore: window.PropertyDeskReminderTemplateStore,
        templateSettings: window.PropertyDeskReminderTemplateSettings,
      },
      quickNote: {
        workflow: window.PropertyDeskPropertyQuickNote,
        noteMaintenance: window.PropertyDeskPropertyNoteMaintenance,
        recordUpdateMaintenance:
          window.PropertyDeskPropertyRecordUpdateMaintenance,
      },
    });
  }

  window.PropertyDeskPropertyWorkspaceModuleCatalog = Object.freeze({
    create: createPropertyWorkspaceModuleCatalog,
  });
})();
