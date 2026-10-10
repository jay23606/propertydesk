/* PropertyDesk: static client backed by Supabase Auth, Postgres and RLS. */
(() => {
  "use strict";

  const {
    $,
    confirmAction,
    promptAction,
    openWindow,
    makeId,
    schedule,
    onDomContentLoaded,
    browserStorage,
    downloadBlob,
    reportError,
  } = window.PropertyDeskAppBrowserAdapters.create({
    windowRef: window,
    documentRef: document,
    downloadUtils: window.PropertyDeskDownloadUtils,
  });
  const appServices = window.PropertyDeskAppServices.create({
    $,
    config: window.PROPERTYDESK_CONFIG || {},
    supabase: window.supabase,
    reportError,
    modules: window.PropertyDeskAppServiceModuleCatalog.create(),
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
      workflows: window.PropertyDeskReportWorkspaceModuleCatalog.create(),
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
      workflows: window.PropertyDeskReminderPreviewModuleCatalog.create(),
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
    workflows: window.PropertyDeskAppShellModuleCatalog.create(),
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
      workflows: window.PropertyDeskPropertyAccountFormsModuleCatalog.create(),
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
    workflows: window.PropertyDeskTransactionWorkspaceModuleCatalog.create(),
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
    workflows: window.PropertyDeskAccountDepositWorkspaceModuleCatalog.create(),
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
      schedule,
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
    workflows: window.PropertyDeskPropertyWorkspaceModuleCatalog.create(),
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
    workflows: window.PropertyDeskImportWorkspaceModuleCatalog.create(),
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
      workflows: window.PropertyDeskBackupWorkspaceModuleCatalog.create(),
    });
  const appLifecycle = window.PropertyDeskAppStartupSetup.create({
    records: {
      ...stateAccess.startup,
      resetWorkspaceState,
    },
    ui: {
      $,
      windowRef: window,
      documentRef: document,
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
    workflows: window.PropertyDeskAppStartupModuleCatalog.create(),
  });
  setWorkspaceRender(appLifecycle.render);
  onDomContentLoaded(appLifecycle.initialize);
})();
