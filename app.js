/* PropertyDesk: static client backed by Supabase Auth, Postgres and RLS. */
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const now = () => new Date();
  const confirmAction = (message) => window.confirm(message);
  const promptAction = (message, initialValue) =>
    window.prompt(message, initialValue);
  const openWindow = (...args) => window.open(...args);
  const reportError = (message, error) => window.console?.error(message, error);
  const transactionTimestamp = () => now().toISOString();
  const writeFeedback = window.PropertyDeskRepositoryWriteFeedback.create({
    modules: {
      reconciliation: window.PropertyDeskWorkspaceWriteReconciliation,
      recordWrites: window.PropertyDeskWorkspaceRecordWriteWorkflow,
    },
  });
  const emailUtils = window.PropertyDeskEmailUtils.create({
    modules: {
      emailAddressUtils: window.PropertyDeskEmailAddressUtils,
      reminderCopy: window.PropertyDeskReminderCopy,
    },
  });
  const postedLedgerUtils = window.PropertyDeskPostedLedgerUtils.create({
    modules: { currencyUtils: window.PropertyDeskCurrencyUtils },
  });
  const { lateReminderMailto, lateReminderSms } = emailUtils;
  const { propertyAddress, streetAddress } =
    window.PropertyDeskPropertyAddressUtils;
  const { dateOnly, fmtDate, fmtDateTime, todayIso, monthStart, monthEnd } =
    window.PropertyDeskDateUtils;
  const { moneyInput } = window.PropertyDeskCurrencyUtils;
  const {
    money,
    esc,
    prettyType,
    prettyKind,
    paymentFrequencyLabel,
    expenseCategoryLabel,
  } = window.PropertyDeskDisplayUtils;
  const { toast } = window.PropertyDeskNotifications.create({ $ });
  const {
    backendConfigured,
    state,
    fetchAll,
    loadAllWorkspacePages,
    repositories,
    setRender: setWorkspaceRender,
    authClient,
    initializeClient,
    getClient,
    isClientReady,
  } = window.PropertyDeskWorkspaceRuntime.create({
    config: window.PROPERTYDESK_CONFIG || {},
    supabase: window.supabase,
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
    toast,
    reportError,
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
  });
  const paymentNotifications = window.PropertyDeskPaymentNotifications.create({
    state,
    getClient,
    toast,
    money,
    propertyAddress,
    refresh: fetchAll,
  });
  const financialContext = window.PropertyDeskWorkspaceFinancialContext.create({
    state,
    todayIso,
    dateUtils: window.PropertyDeskDateUtils,
    currencyUtils: window.PropertyDeskCurrencyUtils,
    postedLedgerUtils,
    isActiveAccount: window.PropertyDeskAccountStatusUtils.isActiveAccount,
    workflows: {
      schedule: window.PropertyDeskScheduleUtils,
      loanSchedule: window.PropertyDeskLoanAmortizationUtils,
      accountFinancialContext:
        window.PropertyDeskWorkspaceAccountFinancialContext,
      ledgerContext: window.PropertyDeskLedgerContext,
      accountSummary: window.PropertyDeskAccountFinancialSummary,
    },
  });
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
  const { depositLedger } = window.PropertyDeskWorkspaceDepositContext.create({
    state,
    postedLedgerUtils,
    workflows: {
      depositLedger: window.PropertyDeskDepositLedgerUtils,
      depositContext: window.PropertyDeskDepositContext,
    },
  });
  // Feature modules receive shared state and helpers; app.js connects workflows.
  const { renderReports, attachReportExportEvents } =
    window.PropertyDeskReportWorkspaceWorkflow.create({
      rendering: {
        $,
        state,
        now,
        dateOnly,
        sumIncome,
        sumOperatingExpenses,
        accountBalance,
        esc,
        money,
        fmtDateTime,
      },
      exporting: {
        $,
        state,
        todayIso,
        prettyType,
        accountBalance,
        downloadBlob: window.PropertyDeskDownloadUtils.downloadBlob,
      },
      workflows: {
        report: window.PropertyDeskReportWorkflow,
        exporter: window.PropertyDeskReportExport,
        model: window.PropertyDeskReportModel,
        views: window.PropertyDeskReportViews,
      },
    });
  const modal = window.PropertyDeskModalController.create({
    $,
    state,
    documentRef: document,
  });
  const { fillSelect, populateFormOptions } =
    window.PropertyDeskFormOptions.create({
      $,
      state,
      esc,
      propertyAddress,
      prettyType,
      modules: {
        domainOptions: window.PropertyDeskDomainOptions,
        transactionOptions: window.PropertyDeskTransactionOptions,
      },
    });
  const { previewReminderEmail } =
    window.PropertyDeskReminderPreviewWorkflow.create({
      $,
      state,
      paymentReminderMessage: emailUtils.paymentReminderMessage,
      amountDueSince,
      unpaidDueAccrualStart,
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
      splitEmailAddresses:
        window.PropertyDeskEmailAddressUtils.splitEmailAddresses,
      workflows: {
        model: window.PropertyDeskReminderPreviewModel,
        preview: window.PropertyDeskReminderPreview,
      },
    });
  const appShell = window.PropertyDeskAppShellWorkflow.create({
    workspaceWorkflow: window.PropertyDeskWorkspace,
    navigationWorkflow: window.PropertyDeskNavigation,
    workspaceWorkflows: {
      profile: window.PropertyDeskWorkspaceProfileWorkflow,
      memberView: window.PropertyDeskWorkspaceMembersView,
      memberMaintenance: window.PropertyDeskWorkspaceMemberMaintenance,
      members: window.PropertyDeskWorkspaceMembers,
      profileModules: {
        display: window.PropertyDeskProfileDisplay,
        view: window.PropertyDeskProfileSettingsView,
        settings: window.PropertyDeskProfileSettings,
      },
    },
    workspace: {
      $,
      state,
      now,
      esc,
      toast,
      fetchAll,
      reminder: {
        workflow: window.PropertyDeskWorkspaceReminderWorkflow,
        activityModelWorkflow: window.PropertyDeskReminderActivityModel,
        activityViewWorkflow: window.PropertyDeskReminderActivityView,
        $,
        state,
        esc,
        fmtDate,
        fmtDateTime,
        money,
      },
      memberRepository: repositories.workspaceMembers,
      writeFeedback,
      confirmAction,
      authClient,
    },
    navigation: {
      $,
      state,
      documentRef: document,
      windowRef: window,
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
  const { attachEvents: attachThemeEvents } = window.PropertyDeskTheme.create();
  const propertyAccountForms =
    window.PropertyDeskPropertyAccountFormsWorkflow.create({
      workflows: {
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
      },
      property: {
        $,
        state,
        toast,
        closeModal,
        fetchAll,
        repository: repositories.properties,
        writeFeedback,
        selectRecordWriteCompletion:
          window.PropertyDeskWorkspaceRecordWriteWorkflow
            .selectRecordWriteCompletion,
      },
      account: {
        $,
        state,
        moneyInput,
        todayIso,
        toast,
        closeModal,
        fetchAll,
        populateFormOptions,
        openModal,
        previewReminderEmail,
        buildAccountPayload: window.PropertyDeskAccountPayload.build,
        formModel: window.PropertyDeskAccountFormModel.create(
          window.PropertyDeskEmailAddressUtils,
        ),
        repository: repositories.accounts,
        writeFeedback,
        selectRecordWriteCompletion:
          window.PropertyDeskWorkspaceRecordWriteWorkflow
            .selectRecordWriteCompletion,
      },
    });
  const transactionWorkspace =
    window.PropertyDeskTransactionWorkspaceWorkflow.create({
      maintenance: {
        correction: {
          $,
          state,
          toast,
          fetchAll,
          closeModal,
          prettyType,
          promptAction,
          EventClass: Event,
          OptionClass: Option,
          repository: repositories.transactions,
          writeFeedback,
          findCorrectionTarget:
            window.PropertyDeskTransactionCorrectionModel.findCorrectionTarget,
        },
        voiding: {
          state,
          toast,
          fetchAll,
          timestamp: transactionTimestamp,
          confirmAction,
          promptAction,
          repository: repositories.transactions,
          writeFeedback,
          resolveVoidTarget:
            window.PropertyDeskTransactionVoidModel.resolveVoidTarget,
          buildVoidPayload:
            window.PropertyDeskTransactionVoidModel.buildVoidPayload,
        },
        events: { documentRef: document },
      },
      maintenanceWorkflows: {
        correction: window.PropertyDeskTransactionCorrectionWorkflow,
        correctionModules: {
          maintenance: window.PropertyDeskTransactionCorrectionMaintenance,
          form: window.PropertyDeskTransactionCorrectionForm,
          view: window.PropertyDeskTransactionCorrectionView,
        },
        voidMaintenance: window.PropertyDeskTransactionVoidMaintenance,
        voidEntry: window.PropertyDeskTransactionVoidEntry,
        events: window.PropertyDeskTransactionMaintenanceEvents,
      },
      recordWorkflows: {
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
      },
      workflows: {
        maintenance: window.PropertyDeskTransactionMaintenanceWorkflow,
        records: window.PropertyDeskTransactionRecordsWorkflow,
      },
      entries: {
        $,
        state,
        moneyInput,
        todayIso,
        toast,
        closeModal,
        fetchAll,
        populateFormOptions,
        fillSelect,
        prettyType,
        openModal,
        transactionRepository: repositories.transactions,
        transactionPayloads: window.PropertyDeskTransactionPayloads,
        writeFeedback,
        selectRecordWriteCompletion:
          window.PropertyDeskWorkspaceRecordWriteWorkflow
            .selectRecordWriteCompletion,
        expenseAccountPolicy: window.PropertyDeskExpenseAccountPolicy,
        workflows: {
          paymentView: window.PropertyDeskPaymentEntryView,
          expenseView: window.PropertyDeskExpenseEntryView,
          propertyPaymentAction: window.PropertyDeskPropertyPaymentAction,
        },
      },
      views: {
        $,
        state,
        dateOnly,
        now,
        fmtDate,
        esc,
        expenseCategoryLabel,
        money,
        postedOnOrAfter,
        monthStart,
        sumIncome,
        sumOperatingExpenses,
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
  } = transactionWorkspace;
  const { attachCreateActionEvents } = window.PropertyDeskCreateActions.create({
    $,
    state,
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
  } = window.PropertyDeskAccountDepositWorkspaceWorkflow.create({
    depositWorkspaceWorkflow: window.PropertyDeskDepositWorkspaceWorkflow,
    depositWorkflows: {
      detailsModel: window.PropertyDeskDepositDetailsModel,
      detailsView: window.PropertyDeskDepositDetailsView,
      adjustmentWorkflow: window.PropertyDeskDepositAdjustmentWorkflow,
      adjustmentModules: {
        maintenance: window.PropertyDeskDepositMaintenance,
        entry: window.PropertyDeskDepositAdjustmentEntry,
        events: window.PropertyDeskDepositDetailEvents,
      },
    },
    accountDetailWorkspaceWorkflow:
      window.PropertyDeskAccountDetailWorkspaceWorkflow,
    accountDetailContentWorkflow:
      window.PropertyDeskAccountDetailContentWorkflow,
    accountDetailActionWorkflow: window.PropertyDeskAccountDetailActionWorkflow,
    accountDetailActionWorkflows: {
      closeMaintenance: window.PropertyDeskAccountCloseMaintenance,
      closeEntry: window.PropertyDeskAccountCloseEntry,
      detailEvents: window.PropertyDeskAccountDetailEvents,
    },
    deposits: {
      details: {
        state,
        depositLedger,
        money,
        fmtDate,
        esc,
      },
      adjustments: {
        $,
        state,
        todayIso,
        toast,
        fetchAll,
        moneyInput,
        repository: repositories.deposits,
        writeFeedback,
        prepareAdjustment: window.PropertyDeskDepositAdjustmentModel.prepare,
        validateAdjustment: window.PropertyDeskDepositAdjustmentModel.validate,
        resolveAdjustmentType:
          window.PropertyDeskDepositAdjustmentModel.resolveType,
        promptAction,
      },
    },
    accountDetails: {
      content: {
        $,
        state,
        money,
        fmtDate,
        fmtDateTime,
        esc,
        sumPosted,
        prettyType,
        paymentFrequencyLabel,
        summarizeAccount,
        amortizationSchedule,
        openModal,
        propertyAddress,
        accountHistoryRepository: repositories.accountHistory,
        workflows: {
          accountHistoryModel: window.PropertyDeskAccountHistoryModel,
          accountHistoryView: window.PropertyDeskAccountHistoryView,
          accountLoanScheduleView: window.PropertyDeskAccountLoanScheduleView,
          accountDetailsView: window.PropertyDeskAccountDetailsView,
          accountDetailsModel: window.PropertyDeskAccountDetailsModel,
          accountDetails: window.PropertyDeskAccountDetails,
        },
      },
      actions: {
        $,
        state,
        toast,
        fetchAll,
        closeModal,
        editAccount: propertyAccountForms.editAccount,
        openPayment,
        repository: repositories.accounts,
        writeFeedback,
        confirmAction,
      },
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
  } = window.PropertyDeskPropertyWorkspaceWorkflow.create({
    groupAccountsByProperty:
      window.PropertyDeskPropertyAccountIndex.groupByProperty,
    isActiveAccount: window.PropertyDeskAccountStatusUtils.isActiveAccount,
    workflows: {
      overview: window.PropertyDeskOverviewWorkflow,
      portfolio: window.PropertyDeskPropertyPortfolioWorkflow,
    },
    detail: {
      content: {
        $,
        state,
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
      },
      management: {
        $,
        state,
        toast,
        fetchAll,
        todayIso,
        propertyRepository: repositories.properties,
        writeFeedback,
        closeModal,
        editAccount: propertyAccountForms.editAccount,
        openAccountDetails,
        openPayment,
        openExpense,
        openAccountForProperty: propertyAccountForms.openAccountForProperty,
      },
      holders: {
        $,
        state,
        toast,
        fetchAll,
        repository: repositories.propertyHolders,
        writeFeedback,
      },
      documents: {
        workflow: window.PropertyDeskPropertyDocumentWorkflow,
        documentsWorkflow: window.PropertyDeskDocuments,
        documentEventsWorkflow: window.PropertyDeskPropertyDetailDocumentEvents,
        $,
        state,
        toast,
        fetchAll,
        confirm: confirmAction,
        openWindow,
        documentRepository: repositories.documents,
        writeFeedback,
        modules: {
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
      },
      workflows: {
        screen: window.PropertyDeskPropertyScreenWorkflow,
        content: window.PropertyDeskPropertyDetailContentWorkflow,
        management: window.PropertyDeskPropertyDetailManagementWorkflow,
        holders: window.PropertyDeskPropertyHolderWorkflow,
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
      },
    },
    overview: {
      $,
      state,
      monthlyScheduledEstimate,
      summarizeAccount,
      collectedSince,
      scheduledMonthlyRunRate,
      monthStart,
      isPosted,
      postedOnOrAfter,
      esc,
      money,
      propertyAddress,
      prettyKind,
      prettyType,
      fmtDate,
      openPropertyPayment,
      workflows: {
        propertySummaryModel: window.PropertyDeskOverviewPropertySummaryModel,
        overviewModel: window.PropertyDeskOverviewModel,
        activityModel: window.PropertyDeskOverviewActivityModel,
        overview: window.PropertyDeskOverview,
        view: window.PropertyDeskOverviewView,
        events: window.PropertyDeskOverviewEvents,
      },
    },
    portfolio: {
      $,
      state,
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
      promptAction,
      openPayment,
      propertyRepository: repositories.properties,
      openAccountForProperty: propertyAccountForms.openAccountForProperty,
      editAccount: propertyAccountForms.editAccount,
      workflows: {
        table: window.PropertyDeskPropertyPortfolioTable,
        reminderModel: window.PropertyDeskPropertyPortfolioReminderModel,
        accountRowModel: window.PropertyDeskPropertyPortfolioAccountRowModel,
        filterModel: window.PropertyDeskPropertyPortfolioFilterModel,
        portfolioModel: window.PropertyDeskPropertyPortfolioModel,
        views: window.PropertyDeskPropertyViews,
        quickNote: window.PropertyDeskPropertyQuickNote,
        noteMaintenance: window.PropertyDeskPropertyNoteMaintenance,
        recordUpdateMaintenance:
          window.PropertyDeskPropertyRecordUpdateMaintenance,
        events: window.PropertyDeskPropertyViewEvents,
      },
    },
  });
  const {
    attachPreviewEvents: attachImportPreviewEvents,
    attachAccountEvents: attachAccountImportEvents,
    attachPaymentEvents: attachPaymentImportEvents,
    attachExpenseEvents: attachExpenseImportEvents,
  } = window.PropertyDeskImportWorkspaceWorkflow.create({
    $,
    state,
    esc,
    openModal,
    closeModal,
    todayIso,
    fetchAll,
    toast,
    repository: repositories.imports,
    writeFeedback,
    workflows: {
      csvValueUtils: window.PropertyDeskCsvValueUtils,
      accountImportTerms: window.PropertyDeskAccountImportTerms,
      paymentImportAllocation: window.PropertyDeskPaymentImportAllocation,
      validationApi: window.PropertyDeskImportValidationApi,
      feature: window.PropertyDeskImportFeature,
    },
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
  });
  const { attachBackupExportEvents } =
    window.PropertyDeskBackupWorkspaceWorkflow.create({
      $,
      state,
      todayIso,
      now,
      toast,
      downloadBlob: window.PropertyDeskDownloadUtils.downloadBlob,
      zipUtils: window.PropertyDeskZipUtils,
      workspaceTables: window.PropertyDeskWorkspaceTables,
      loadAllPages: loadAllWorkspacePages,
      isClientReady,
      collectBackupAgreementFiles:
        window.PropertyDeskBackupAgreementFiles.collect,
      documentRepository: repositories.documents,
      workflows: {
        utils: window.PropertyDeskBackupUtils,
        records: window.PropertyDeskBackupRecords,
        exporter: {
          create: window.PropertyDeskBackupExport.create,
          modules: { archive: window.PropertyDeskBackupArchive },
        },
      },
    });
  const appLifecycle = window.PropertyDeskAppStartupWorkflow.create({
    $,
    backendConfigured,
    initializeClient,
    todayIso,
    registerShell: window.PropertyDeskPwa.registerShell,
    authClient,
    authContext: { $, state, fetchAll, toast, paymentNotifications },
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
    workflows: {
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
          resetWorkspaceState: window.PropertyDeskAppState.resetWorkspaceState,
        },
      },
      lifecycle: window.PropertyDeskAppLifecycle,
    },
  });
  setWorkspaceRender(appLifecycle.render);
  document.addEventListener("DOMContentLoaded", appLifecycle.initialize);
})();
