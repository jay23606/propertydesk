/* PropertyDesk: static client backed by Supabase Auth, Postgres and RLS. */
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const confirmAction = (message) => window.confirm(message);
  const promptAction = (message, initialValue) =>
    window.prompt(message, initialValue);
  const openWindow = (...args) => window.open(...args);
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
    },
  });
  const {
    writeFeedback,
    emailUtils,
    toast,
    backendConfigured,
    state,
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
    window.PropertyDeskReportWorkspaceWorkflow.create({
      rendering: {
        $,
        getPayments: () => state.payments,
        getExpenses: () => state.expenses,
        getAccounts: () => state.accounts,
        getImportBatches: () => state.importBatches,
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
      getProperty: (propertyId) => {
        const property = state.properties.find(
          (item) => item.id === propertyId,
        );
        if (!property) return null;
        const {
          id,
          address,
          city,
          state: propertyState,
          postal_code,
        } = property;
        return { id, address, city, state: propertyState, postal_code };
      },
      getPaymentsForAccount: (accountId) =>
        state.payments
          .filter((payment) => payment.account_id === accountId)
          .map(
            ({
              account_id,
              received_date,
              amount,
              status,
              income_category,
            }) => ({
              account_id,
              received_date,
              amount,
              status,
              income_category,
            }),
          ),
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
      run: writeFeedback.run,
      runAndRefreshWorkspaceChange: writeFeedback.runAndRefreshWorkspaceChange,
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
        saveWorkspaceRecord: writeFeedback.saveWorkspaceRecord,
        saveAndRefreshWorkspaceRecord:
          writeFeedback.saveAndRefreshWorkspaceRecord,
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
        saveWorkspaceRecord: writeFeedback.saveWorkspaceRecord,
        saveAndRefreshWorkspaceRecord:
          writeFeedback.saveAndRefreshWorkspaceRecord,
        selectRecordWriteCompletion:
          window.PropertyDeskWorkspaceRecordWriteWorkflow
            .selectRecordWriteCompletion,
      },
    });
  const transactionCorrectionModel =
    window.PropertyDeskTransactionCorrectionModel.create({
      getPayments: () => state.payments,
      getExpenses: () => state.expenses,
      getAccounts: () => state.accounts,
    });
  const transactionMaintenance =
    window.PropertyDeskTransactionMaintenanceWorkflow.create({
      correction: {
        $,
        getPendingCorrection: () => state.pendingCorrection,
        setPendingCorrection: (value) => {
          state.pendingCorrection = value;
        },
        getPayments: () => state.payments,
        getExpenses: () => state.expenses,
        toast,
        fetchAll,
        closeModal,
        prettyType,
        promptAction,
        EventClass: Event,
        OptionClass: Option,
        repository: repositories.transactions,
        runAndRefreshWorkspaceChange:
          writeFeedback.runAndRefreshWorkspaceChange,
        findCorrectionTarget: transactionCorrectionModel.findCorrectionTarget,
      },
      voiding: {
        getPayments: () => state.payments,
        getExpenses: () => state.expenses,
        toast,
        fetchAll,
        timestamp: transactionTimestamp,
        confirmAction,
        promptAction,
        repository: repositories.transactions,
        runAndRefreshWorkspaceChange:
          writeFeedback.runAndRefreshWorkspaceChange,
        resolveVoidTarget:
          window.PropertyDeskTransactionVoidModel.resolveVoidTarget,
        buildVoidPayload:
          window.PropertyDeskTransactionVoidModel.buildVoidPayload,
      },
      events: { documentRef: document },
      workflows: {
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
    });
  const ledgerWorkflow = window.PropertyDeskLedgerWorkflow.create({
    maintenance: transactionMaintenance,
    workflows: {
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
    entries: {
      $,
      getAccounts: () => state.accounts,
      getPayments: () => state.payments,
      getExpenses: () => state.expenses,
      getWorkspaceOwnerId: () => state.workspaceOwnerId,
      getPendingCorrection: () => state.pendingCorrection,
      setPendingCorrection: (value) => {
        state.pendingCorrection = value;
      },
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
      saveWorkspaceRecord: writeFeedback.saveWorkspaceRecord,
      saveAndRefreshWorkspaceRecord:
        writeFeedback.saveAndRefreshWorkspaceRecord,
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
      getProperties: () => state.properties,
      getAccounts: () => state.accounts,
      getPayments: () => state.payments,
      getExpenses: () => state.expenses,
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
  } = ledgerWorkflow;
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
        depositLedger,
        money,
        fmtDate,
        esc,
      },
      adjustments: {
        $,
        getAccount: (accountId) =>
          state.accounts.find((account) => account.id === accountId) || null,
        getWorkspaceOwnerId: () => state.workspaceOwnerId,
        getCollection: (collection) =>
          collection === "depositEntries" ? state.depositEntries : null,
        todayIso,
        toast,
        fetchAll,
        moneyInput,
        repository: repositories.deposits,
        saveAndRefreshWorkspaceRecord:
          writeFeedback.saveAndRefreshWorkspaceRecord,
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
        getAccount: (accountId) =>
          state.accounts.find((account) => account.id === accountId) || null,
        getProperty: (propertyId) =>
          state.properties.find((property) => property.id === propertyId) ||
          null,
        getPaymentsForAccount: (accountId) =>
          state.payments.filter((payment) => payment.account_id === accountId),
        getAgreementVersions: (accountId) =>
          state.agreementVersions.filter(
            (version) => version.account_id === accountId,
          ),
        beginAuditRequest: () => ++state.auditRequestId,
        isCurrentAuditRequest: (requestId) =>
          requestId === state.auditRequestId,
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
        getAccount: (accountId) =>
          state.accounts.find((account) => account.id === accountId) || null,
        getCollection: (collection) =>
          collection === "accounts" ? state.accounts : null,
        toast,
        fetchAll,
        closeModal,
        editAccount: propertyAccountForms.editAccount,
        openPayment,
        repository: repositories.accounts,
        saveAndRefreshWorkspaceRecord:
          writeFeedback.saveAndRefreshWorkspaceRecord,
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
        beginAuditRequest: () => ++state.auditRequestId,
        setSelectedPropertyId: (id) => {
          state.selectedPropertyId = id;
        },
        getPayments: () => state.payments,
        getExpenses: () => state.expenses,
        getProperties: () => state.properties,
        getAccounts: () => state.accounts,
        getDocuments: () => state.documents,
        getWorkspaceMembers: () => state.workspaceMembers,
        getPropertyHolders: () => state.propertyHolders,
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
        saveAndRefreshWorkspaceRecord:
          writeFeedback.saveAndRefreshWorkspaceRecord,
        closeModal,
        editAccount: propertyAccountForms.editAccount,
        openAccountDetails,
        openPayment,
        openExpense,
        openAccountForProperty: propertyAccountForms.openAccountForProperty,
      },
      holders: {
        $,
        getSelectedPropertyId: () => state.selectedPropertyId,
        getWorkspaceOwnerId: () => state.workspaceOwnerId,
        getPropertyHolders: () => state.propertyHolders,
        toast,
        fetchAll,
        repository: repositories.propertyHolders,
        reconcileWorkspaceChange: writeFeedback.reconcileWorkspaceChange,
        refreshWorkspace: writeFeedback.refreshWorkspace,
      },
      documents: {
        workflow: window.PropertyDeskPropertyDocumentWorkflow,
        documentsWorkflow: window.PropertyDeskDocuments,
        documentEventsWorkflow: window.PropertyDeskPropertyDetailDocumentEvents,
        $,
        getSelectedPropertyId: () => state.selectedPropertyId,
        getWorkspaceOwnerId: () => state.workspaceOwnerId,
        getDocuments: () => state.documents,
        toast,
        fetchAll,
        confirm: confirmAction,
        openWindow,
        documentRepository: repositories.documents,
        refreshWorkspace: writeFeedback.refreshWorkspace,
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
      getProperties: () => state.properties,
      getAccounts: () => state.accounts,
      getPayments: () => state.payments,
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
      saveAndRefreshWorkspaceRecord:
        writeFeedback.saveAndRefreshWorkspaceRecord,
      promptAction,
      openPayment,
      propertyRepository: repositories.properties,
      openModal,
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
        pdfExport: window.PropertyDeskPropertyPdfExport,
        templateSettings: window.PropertyDeskReminderTemplateSettings,
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
    refreshWorkspace: writeFeedback.refreshWorkspace,
    workflows: {
      csvValueUtils: window.PropertyDeskCsvValueUtils,
      accountImportTerms: window.PropertyDeskAccountImportTerms,
      paymentImportAllocation: window.PropertyDeskPaymentImportAllocation,
      validationApi: window.PropertyDeskImportValidationApi,
      feature: window.PropertyDeskImportFeature,
    },
    validationWorkflow: window.PropertyDeskImportValidationWorkflow,
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
