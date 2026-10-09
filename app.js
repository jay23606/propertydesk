/* PropertyDesk: static client backed by Supabase Auth, Postgres and RLS. */
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const confirmAction = (message) => window.confirm(message);
  const promptAction = (message, initialValue) =>
    window.prompt(message, initialValue);
  const openWindow = (...args) => window.open(...args);
  const makeId = () => window.crypto.randomUUID();
  const browserStorage = Object.freeze({
    getItem: (key) => window.localStorage.getItem(key),
    setItem: (key, value) => window.localStorage.setItem(key, value),
  });
  const downloadBlob = (blob, filename) =>
    window.PropertyDeskDownloadUtils.downloadBlob(blob, filename, {
      documentRef: document,
      urlRef: window.URL,
      defer: window.setTimeout.bind(window),
    });
  const reportError = (message, error) => window.console?.error(message, error);
  const appServices = window.PropertyDeskAppServices.create({
    $,
    config: window.PROPERTYDESK_CONFIG || {},
    supabase: window.supabase,
    reportError,
    modules: {
      writeFeedback: {
        factory: window.PropertyDeskRepositoryWriteFeedback,
        reconciliation: window.PropertyDeskWorkspaceWriteReconciliation,
        recordWrites: window.PropertyDeskWorkspaceRecordWriteWorkflow,
      },
      emailUtils: {
        factory: window.PropertyDeskEmailUtils,
        emailAddressUtils: window.PropertyDeskEmailAddressUtils,
        reminderCopy: window.PropertyDeskReminderCopy,
      },
      postedLedger: {
        factory: window.PropertyDeskPostedLedgerUtils,
        currencyUtils: window.PropertyDeskCurrencyUtils,
      },
      notifications: window.PropertyDeskNotifications,
      workspaceRuntime: {
        factory: window.PropertyDeskWorkspaceRuntime,
        repositories: {
          queryUtils: window.PropertyDeskRepositoryQueryUtils,
          accounts: window.PropertyDeskAccountRepository,
          accountHistory: window.PropertyDeskAccountHistoryRepository,
          deposits: window.PropertyDeskDepositRepository,
          documents: window.PropertyDeskDocumentRepository,
          imports: window.PropertyDeskImportRepository,
          properties: window.PropertyDeskPropertyRepository,
          propertyHolders: window.PropertyDeskPropertyHolderRepository,
          transactions: window.PropertyDeskTransactionRepository,
          workspaceMembers: window.PropertyDeskWorkspaceMemberRepository,
        },
        tables: window.PropertyDeskWorkspaceTables,
        workflows: {
          backendClient: window.PropertyDeskBackendClient,
          appState: window.PropertyDeskAppState,
          authClient: window.PropertyDeskAuthClient,
          repositoryRegistry: window.PropertyDeskRepositoryRegistry,
          query: window.PropertyDeskWorkspaceQuery,
          readCatalog: window.PropertyDeskWorkspaceReadCatalog,
          data: window.PropertyDeskWorkspaceData,
          refresh: window.PropertyDeskWorkspaceRefresh,
        },
      },
      paymentNotificationSetup: window.PropertyDeskPaymentNotificationSetup,
      paymentNotifications: window.PropertyDeskPaymentNotifications,
      displayUtils: window.PropertyDeskDisplayUtils,
      propertyAddressUtils: window.PropertyDeskPropertyAddressUtils,
      dateUtils: window.PropertyDeskDateUtils,
      currencyUtils: window.PropertyDeskCurrencyUtils,
      accountStatusUtils: window.PropertyDeskAccountStatusUtils,
      financialContext: {
        factory: window.PropertyDeskWorkspaceFinancialContext,
        workflows: {
          schedule: window.PropertyDeskScheduleUtils,
          loanSchedule: window.PropertyDeskLoanAmortizationUtils,
          accountFinancialContext:
            window.PropertyDeskWorkspaceAccountFinancialContext,
          ledgerContext: window.PropertyDeskLedgerContext,
          accountSummary: window.PropertyDeskAccountFinancialSummary,
        },
      },
      depositContext: {
        factory: window.PropertyDeskWorkspaceDepositContext,
        workflows: {
          depositLedger: window.PropertyDeskDepositLedgerUtils,
          depositContext: window.PropertyDeskDepositContext,
        },
      },
      stateAccess: window.PropertyDeskAppStateAccess,
    },
  });
  const {
    writeFeedback,
    emailUtils,
    toast,
    backendConfigured,
    stateAccess,
    resetWorkspaceState,
    fetchAll,
    loadAllWorkspacePages,
    repositories,
    setRender: setWorkspaceRender,
    authClient,
    initializeClient,
    isClientReady,
    paymentNotifications,
    financialContext,
    depositLedger,
  } = appServices;
  const { lateReminderMailto, lateReminderSms } = emailUtils;
  const { propertyAddress, streetAddress } =
    window.PropertyDeskPropertyAddressUtils;
  const {
    now,
    timestampIso: transactionTimestamp,
    dateOnly,
    fmtDate,
    fmtDateTime,
    todayIso,
    monthStart,
    monthEnd,
  } = window.PropertyDeskDateUtils;
  const { moneyInput } = window.PropertyDeskCurrencyUtils;
  const {
    money,
    esc,
    prettyType,
    prettyKind,
    paymentFrequencyLabel,
    expenseCategoryLabel,
  } = window.PropertyDeskDisplayUtils;
  const {
    isPosted,
    paymentStatusInMonth,
    postedOnOrAfter,
    sumIncome,
    sumOperatingExpenses,
    sumPosted,
    amountDueSince,
    monthlyScheduledEstimate,
    unpaidDueAccrualStart,
    amortizationSchedule,
    accountBalance,
    scheduledMonthlyRunRate,
    collectedSince,
    summarizeAccount,
  } = financialContext;
  // Feature modules receive shared state and helpers; app.js connects workflows.
  const { renderReports, attachReportExportEvents } =
    window.PropertyDeskReportWorkspaceSetup.create({
      records: stateAccess.report,
      ui: {
        $,
        now,
        dateOnly,
        sumIncome,
        sumOperatingExpenses,
        accountBalance,
        esc,
        money,
        fmtDateTime,
        todayIso,
        prettyType,
      },
      services: {
        downloadBlob,
      },
      workflows: {
        reportWorkspace: window.PropertyDeskReportWorkspaceWorkflow,
        report: window.PropertyDeskReportWorkflow,
        exporter: window.PropertyDeskReportExport,
        model: window.PropertyDeskReportModel,
        views: window.PropertyDeskReportViews,
      },
    });
  const modal = window.PropertyDeskModalController.create({
    $,
    setPendingImport: stateAccess.modal.setPendingImport,
    setPendingCorrection: stateAccess.modal.setPendingCorrection,
    advanceAuditRequestId: stateAccess.modal.advanceAuditRequestId,
    documentRef: document,
  });
  const { fillSelect, populateFormOptions } =
    window.PropertyDeskFormOptions.create({
      $,
      ...stateAccess.formOptions,
      esc,
      propertyAddress,
      prettyType,
      modules: {
        domainOptions: window.PropertyDeskDomainOptions,
        transactionOptions: window.PropertyDeskTransactionOptions,
      },
    });
  const { previewReminderEmail } =
    window.PropertyDeskReminderPreviewSetup.create({
      records: stateAccess.reminderPreview,
      ui: {
        $,
        monthEnd,
        dateOnly,
        monthStart,
        propertyAddress,
        money,
        todayIso,
        moneyInput,
        toast,
        esc,
        openModal: modal.openModal,
      },
      services: {
        paymentReminderMessage: emailUtils.paymentReminderMessage,
        amountDueSince,
        unpaidDueAccrualStart,
        splitEmailAddresses:
          window.PropertyDeskEmailAddressUtils.splitEmailAddresses,
      },
      workflows: {
        previewWorkflow: window.PropertyDeskReminderPreviewWorkflow,
        model: window.PropertyDeskReminderPreviewModel,
        preview: window.PropertyDeskReminderPreview,
      },
    });
  const appShell = window.PropertyDeskAppShellSetup.create({
    records: stateAccess.appShell,
    ui: {
      $,
      now,
      esc,
      toast,
      confirmAction,
      reminder: {
        workflow: window.PropertyDeskWorkspaceReminderWorkflow,
        activityModelWorkflow: window.PropertyDeskReminderActivityModel,
        activityViewWorkflow: window.PropertyDeskReminderActivityView,
        $,
        esc,
        fmtDate,
        fmtDateTime,
        money,
      },
      documentRef: document,
      windowRef: window,
    },
    services: {
      fetchAll,
      memberRepository: repositories.workspaceMembers,
      run: writeFeedback.run,
      runAndRefreshWorkspaceChange: writeFeedback.runAndRefreshWorkspaceChange,
      authClient,
    },
    workflows: {
      shell: window.PropertyDeskAppShellWorkflow,
      workspace: window.PropertyDeskWorkspace,
      navigation: window.PropertyDeskNavigation,
      workspaceModules: {
        profile: window.PropertyDeskWorkspaceProfileWorkflow,
        memberView: window.PropertyDeskWorkspaceMembersView,
        memberMaintenance: window.PropertyDeskWorkspaceMemberMaintenance,
        members: window.PropertyDeskWorkspaceMembers,
        reminderActivityData: window.PropertyDeskWorkspaceReminderActivityData,
        profileModules: {
          display: window.PropertyDeskProfileDisplay,
          view: window.PropertyDeskProfileSettingsView,
          settings: window.PropertyDeskProfileSettings,
        },
      },
    },
  });
  const {
    updateGreeting,
    attachProfileEvents,
    attachWorkspaceMemberEvents,
    navigate,
    attachNavigationEvents,
  } = appShell;
  const { attachEvents: attachModalEvents, openModal, closeModal } = modal;
  const { attachEvents: attachThemeEvents } = window.PropertyDeskTheme.create({
    storage: browserStorage,
  });
  const propertyAccountForms =
    window.PropertyDeskPropertyAccountFormsSetup.create({
      records: stateAccess.propertyAccountForms,
      ui: {
        $,
        moneyInput,
        todayIso,
        toast,
        closeModal,
        populateFormOptions,
        openModal,
        previewReminderEmail,
      },
      services: {
        fetchAll,
        propertyRepository: repositories.properties,
        accountRepository: repositories.accounts,
        saveWorkspaceRecord: writeFeedback.saveWorkspaceRecord,
        saveAndRefreshWorkspaceRecord:
          writeFeedback.saveAndRefreshWorkspaceRecord,
      },
      workflows: {
        forms: window.PropertyDeskPropertyAccountFormsWorkflow,
        propertyForm: window.PropertyDeskPropertyForm,
        accountForm: window.PropertyDeskAccountForm,
        propertyFormModules: {
          view: window.PropertyDeskPropertyFormView,
          saveWorkflow: window.PropertyDeskWorkspaceFormSaveWorkflow,
          maintenance: window.PropertyDeskPropertySaveMaintenance,
          recordSaveMaintenance:
            window.PropertyDeskWorkspaceRecordSaveMaintenance,
        },
        accountFormModules: {
          view: window.PropertyDeskAccountFormView,
          saveWorkflow: window.PropertyDeskWorkspaceFormSaveWorkflow,
          maintenance: window.PropertyDeskAccountFormMaintenance,
          recordSaveMaintenance:
            window.PropertyDeskWorkspaceRecordSaveMaintenance,
          propertyAction: window.PropertyDeskPropertyAccountAction,
        },
        accountPayload: window.PropertyDeskAccountPayload,
        accountFormModel: window.PropertyDeskAccountFormModel,
        emailAddressUtils: window.PropertyDeskEmailAddressUtils,
        recordWrite: window.PropertyDeskWorkspaceRecordWriteWorkflow,
      },
    });
  const ledgerWorkflow = window.PropertyDeskTransactionWorkspaceSetup.create({
    records: stateAccess.transactions,
    ui: {
      $,
      toast,
      closeModal,
      openModal,
      promptAction,
      confirmAction,
      EventClass: Event,
      OptionClass: Option,
      transactionTimestamp,
      moneyInput,
      todayIso,
      fillSelect,
      populateFormOptions,
      prettyType,
      dateOnly,
      now,
      fmtDate,
      esc,
      expenseCategoryLabel,
      money,
      monthStart,
      documentRef: document,
    },
    services: {
      fetchAll,
      transactionRepository: repositories.transactions,
      runAndRefreshWorkspaceChange: writeFeedback.runAndRefreshWorkspaceChange,
      saveWorkspaceRecord: writeFeedback.saveWorkspaceRecord,
      saveAndRefreshWorkspaceRecord:
        writeFeedback.saveAndRefreshWorkspaceRecord,
      selectRecordWriteCompletion:
        window.PropertyDeskWorkspaceRecordWriteWorkflow
          .selectRecordWriteCompletion,
      postedOnOrAfter,
      sumIncome,
      sumOperatingExpenses,
    },
    workflows: {
      workspace: window.PropertyDeskTransactionWorkspaceWorkflow,
      correctionModel: window.PropertyDeskTransactionCorrectionModel,
      maintenance: window.PropertyDeskTransactionMaintenanceWorkflow,
      correction: window.PropertyDeskTransactionCorrectionWorkflow,
      correctionModules: {
        maintenance: window.PropertyDeskTransactionCorrectionMaintenance,
        form: window.PropertyDeskTransactionCorrectionForm,
        view: window.PropertyDeskTransactionCorrectionView,
      },
      voidModel: window.PropertyDeskTransactionVoidModel,
      voidMaintenance: window.PropertyDeskTransactionVoidMaintenance,
      voidEntry: window.PropertyDeskTransactionVoidEntry,
      maintenanceEvents: window.PropertyDeskTransactionMaintenanceEvents,
      ledger: window.PropertyDeskLedgerWorkflow,
      entryForms: {
        create: window.PropertyDeskLedgerEntryForms.create,
        modules: {
          transactionInserts: window.PropertyDeskTransactionInserts,
          saveWorkflow: window.PropertyDeskLedgerEntrySaveWorkflow,
          paymentForm: window.PropertyDeskPaymentEntryForm,
          expenseForm: window.PropertyDeskExpenseEntryForm,
        },
      },
      views: {
        create: window.PropertyDeskTransactionViews.create,
        modules: {
          filterModel: window.PropertyDeskTransactionListFilterModel,
          associationModel: window.PropertyDeskTransactionAssociationModel,
          displayRowModel: window.PropertyDeskTransactionDisplayRowModel,
          listModel: window.PropertyDeskTransactionListModel,
          summaryModel: window.PropertyDeskTransactionSummaryModel,
          rowView: window.PropertyDeskTransactionRowView,
        },
      },
      transactionPayloads: window.PropertyDeskTransactionPayloads,
      expenseAccountPolicy: window.PropertyDeskExpenseAccountPolicy,
      paymentView: window.PropertyDeskPaymentEntryView,
      expenseView: window.PropertyDeskExpenseEntryView,
      propertyPaymentAction: window.PropertyDeskPropertyPaymentAction,
    },
  });
  const {
    attachLedgerEntryFormEvents,
    attachTransactionActionEvents,
    attachTransactionFilterEvents,
    openExpense,
    openPayment,
    openPropertyPayment,
    renderPayments,
  } = ledgerWorkflow;
  const { attachCreateActionEvents } = window.PropertyDeskCreateActions.create({
    $,
    ...stateAccess.createActions,
    toast,
    resetPropertyForm: propertyAccountForms.resetPropertyForm,
    openModal,
    openAccountForProperty: propertyAccountForms.openAccountForProperty,
    openPayment,
    openExpense,
    navigate,
    documentRef: document,
  });
  const {
    openAccountDetails,
    attachAccountDetailActionEvents,
    attachDepositAdjustmentEvents,
  } = window.PropertyDeskAccountDepositWorkspaceSetup.create({
    records: stateAccess.accountDeposit,
    ui: {
      $,
      money,
      fmtDate,
      fmtDateTime,
      esc,
      sumPosted,
      prettyType,
      paymentFrequencyLabel,
      summarizeAccount,
      amortizationSchedule,
      propertyAddress,
      todayIso,
      toast,
      moneyInput,
      promptAction,
      openModal,
      closeModal,
      editAccount: propertyAccountForms.editAccount,
      openPayment,
      confirmAction,
    },
    services: {
      depositLedger,
      fetchAll,
      depositRepository: repositories.deposits,
      accountHistoryRepository: repositories.accountHistory,
      accountRepository: repositories.accounts,
      saveAndRefreshWorkspaceRecord:
        writeFeedback.saveAndRefreshWorkspaceRecord,
    },
    workflows: {
      workspace: window.PropertyDeskAccountDepositWorkspaceWorkflow,
      deposit: {
        workspace: window.PropertyDeskDepositWorkspaceWorkflow,
        detailsModel: window.PropertyDeskDepositDetailsModel,
        detailsView: window.PropertyDeskDepositDetailsView,
        adjustmentWorkflow: window.PropertyDeskDepositAdjustmentWorkflow,
        adjustmentModules: {
          maintenance: window.PropertyDeskDepositMaintenance,
          entry: window.PropertyDeskDepositAdjustmentEntry,
          events: window.PropertyDeskDepositDetailEvents,
        },
      },
      accountDetails: {
        workspace: window.PropertyDeskAccountDetailWorkspaceWorkflow,
        content: window.PropertyDeskAccountDetailContentWorkflow,
        action: window.PropertyDeskAccountDetailActionWorkflow,
        actionWorkflows: {
          closeMaintenance: window.PropertyDeskAccountCloseMaintenance,
          closeEntry: window.PropertyDeskAccountCloseEntry,
          detailEvents: window.PropertyDeskAccountDetailEvents,
        },
        contentModules: {
          accountHistoryModel: window.PropertyDeskAccountHistoryModel,
          accountHistoryView: window.PropertyDeskAccountHistoryView,
          accountLoanScheduleView: window.PropertyDeskAccountLoanScheduleView,
          accountDetailsView: window.PropertyDeskAccountDetailsView,
          accountDetailsModel: window.PropertyDeskAccountDetailsModel,
          accountDetails: window.PropertyDeskAccountDetails,
        },
      },
      adjustmentModel: window.PropertyDeskDepositAdjustmentModel,
    },
  });
  const {
    attachPropertyDetailEvents,
    attachPropertyQuickActionEvents,
    attachPropertyHolderEvents,
    attachPropertyDocumentEvents,
    renderOverview,
    attachOverviewEvents,
    renderProperties,
    attachPropertyGridEvents,
    attachPropertyActionEvents,
  } = window.PropertyDeskPropertyWorkspaceSetup.create({
    records: stateAccess.properties,
    ui: {
      $,
      isPosted,
      sumIncome,
      sumOperatingExpenses,
      money,
      fmtDate,
      esc,
      prettyType,
      paymentFrequencyLabel,
      accountBalance,
      openModal,
      propertyAddress,
      toast,
      todayIso,
      confirmAction,
      openWindow,
      makeId,
      schedule: window.setTimeout.bind(window),
      monthlyScheduledEstimate,
      summarizeAccount,
      collectedSince,
      scheduledMonthlyRunRate,
      monthStart,
      postedOnOrAfter,
      prettyKind,
      streetAddress,
      amountDueSince,
      dateOnly,
      monthEnd,
      lateReminderMailto,
      lateReminderSms,
      paymentStatusInMonth,
      storage: browserStorage,
      promptAction,
    },
    services: {
      fetchAll,
      propertyRepository: repositories.properties,
      propertyHolderRepository: repositories.propertyHolders,
      documentRepository: repositories.documents,
      saveAndRefreshWorkspaceRecord:
        writeFeedback.saveAndRefreshWorkspaceRecord,
      reconcileWorkspaceChange: writeFeedback.reconcileWorkspaceChange,
      refreshWorkspace: writeFeedback.refreshWorkspace,
      closeModal,
      editAccount: propertyAccountForms.editAccount,
      openAccountDetails,
      openPayment,
      openExpense,
      openAccountForProperty: propertyAccountForms.openAccountForProperty,
      openPropertyPayment,
    },
    workflows: {
      workspace: window.PropertyDeskPropertyWorkspaceWorkflow,
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
    },
  });
  const {
    attachPreviewEvents: attachImportPreviewEvents,
    attachAccountEvents: attachAccountImportEvents,
    attachPaymentEvents: attachPaymentImportEvents,
    attachExpenseEvents: attachExpenseImportEvents,
  } = window.PropertyDeskImportWorkspaceSetup.create({
    records: stateAccess.imports,
    ui: { $, esc, openModal, closeModal, todayIso, toast },
    services: {
      fetchAll,
      repository: repositories.imports,
      refreshWorkspace: writeFeedback.refreshWorkspace,
    },
    workflows: {
      imports: window.PropertyDeskImportWorkspaceWorkflow,
      csvValueUtils: window.PropertyDeskCsvValueUtils,
      accountImportTerms: window.PropertyDeskAccountImportTerms,
      paymentImportAllocation: window.PropertyDeskPaymentImportAllocation,
      validationApi: window.PropertyDeskImportValidationApi,
      feature: window.PropertyDeskImportFeature,
      validation: window.PropertyDeskImportValidationWorkflow,
      modules: {
        currencyUtils: window.PropertyDeskCurrencyUtils,
        displayUtils: window.PropertyDeskDisplayUtils,
        domainOptions: window.PropertyDeskDomainOptions,
        transactionOptions: window.PropertyDeskTransactionOptions,
        expenseAccountPolicy: window.PropertyDeskExpenseAccountPolicy,
        emailAddresses: window.PropertyDeskEmailAddressUtils,
        accountValidation: window.PropertyDeskAccountImportValidation,
        accountImportIdentity: window.PropertyDeskAccountImportIdentity,
        expenseValidation: window.PropertyDeskExpenseImportValidation,
        paymentValidation: window.PropertyDeskPaymentImportValidation,
        importRows: window.PropertyDeskImportRows,
        csvParser: window.PropertyDeskCsvParser,
        preview: {
          create: window.PropertyDeskImportPreview.create,
          modules: {
            correctionView: window.PropertyDeskImportCorrectionView,
            rendering: window.PropertyDeskImportPreviewRendering,
            table: window.PropertyDeskImportPreviewTable,
          },
        },
        previewEvents: window.PropertyDeskImportPreviewEvents,
        commit: {
          create: window.PropertyDeskImportCommit.create,
          modules: {
            batchReconciliation: window.PropertyDeskImportBatchReconciliation,
            reporting: window.PropertyDeskImportCommitReporting,
          },
        },
        review: window.PropertyDeskImportReview,
        accountImport: window.PropertyDeskAccountImport,
        accountImportPayload: window.PropertyDeskAccountImportPayload,
        csvImportFile: window.PropertyDeskCsvImportFile,
        transactionImport: window.PropertyDeskTransactionImportFeature,
        paymentImport: window.PropertyDeskPaymentImport,
        expenseImport: window.PropertyDeskExpenseImport,
        transactionImportWorkflow: window.PropertyDeskTransactionImportWorkflow,
      },
    },
  });
  const { attachBackupExportEvents } =
    window.PropertyDeskBackupWorkspaceSetup.create({
      records: stateAccess.backup,
      ui: { $, now, todayIso, toast },
      services: {
        isClientReady,
        downloadBlob,
        workspaceTables: window.PropertyDeskWorkspaceTables,
        loadAllPages: loadAllWorkspacePages,
        collectBackupAgreementFiles:
          window.PropertyDeskBackupAgreementFiles.collect,
        documentRepository: repositories.documents,
      },
      workflows: {
        backup: window.PropertyDeskBackupWorkspaceWorkflow,
        zipUtils: window.PropertyDeskZipUtils,
        utils: window.PropertyDeskBackupUtils,
        records: window.PropertyDeskBackupRecords,
        exporter: {
          create: window.PropertyDeskBackupExport.create,
          modules: { archive: window.PropertyDeskBackupArchive },
        },
      },
    });
  const appLifecycle = window.PropertyDeskAppStartupSetup.create({
    records: {
      ...stateAccess.startup,
      resetWorkspaceState,
    },
    ui: {
      $,
      todayIso,
      toast,
      renderers: [
        updateGreeting,
        renderOverview,
        renderProperties,
        renderPayments,
        renderReports,
      ],
      eventBindersBeforeAuth: [
        attachModalEvents,
        attachThemeEvents,
        attachNavigationEvents,
        attachProfileEvents,
        attachWorkspaceMemberEvents,
        attachOverviewEvents,
        attachPropertyGridEvents,
        attachPropertyActionEvents,
        attachTransactionFilterEvents,
        attachTransactionActionEvents,
        attachAccountDetailActionEvents,
        attachDepositAdjustmentEvents,
        attachCreateActionEvents,
        propertyAccountForms.attachPropertyFormEvents,
        propertyAccountForms.attachAccountFormEvents,
        attachLedgerEntryFormEvents,
        attachPropertyDetailEvents,
        attachPropertyHolderEvents,
        attachPropertyQuickActionEvents,
        attachPropertyDocumentEvents,
      ],
      eventBindersAfterAuth: [
        attachImportPreviewEvents,
        attachAccountImportEvents,
        attachPaymentImportEvents,
        attachExpenseImportEvents,
        attachBackupExportEvents,
        attachReportExportEvents,
      ],
    },
    services: {
      backendConfigured,
      initializeClient,
      registerShell: window.PropertyDeskPwa.registerShell,
      authClient,
      fetchAll,
      paymentNotifications,
    },
    workflows: {
      startup: window.PropertyDeskAppStartupWorkflow,
      auth: {
        create: window.PropertyDeskAuth.create,
        modules: {
          screens: window.PropertyDeskAuthScreens,
          form: window.PropertyDeskAuthForm,
          formView: window.PropertyDeskAuthFormView,
          recovery: window.PropertyDeskAuthRecovery,
          recoveryView: window.PropertyDeskAuthRecoveryView,
          resetRequest: window.PropertyDeskAuthResetRequest,
          session: window.PropertyDeskAuthSession,
        },
      },
      lifecycle: window.PropertyDeskAppLifecycle,
    },
  });
  setWorkspaceRender(appLifecycle.render);
  document.addEventListener("DOMContentLoaded", appLifecycle.initialize);
})();
