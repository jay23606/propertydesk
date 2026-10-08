/* PropertyDesk: static client backed by Supabase Auth, Postgres and RLS. */
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  let appLifecycle;
  function render() {
    appLifecycle.render();
  }
  const { lateReminderMailto } = window.PropertyDeskEmailUtils;
  const { propertyAddress, streetAddress } =
    window.PropertyDeskPropertyAddressUtils;
  const { dateOnly, fmtDate, todayIso, monthStart, monthEnd } =
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
    authClient,
    initializeClient,
    isClientReady,
  } = window.PropertyDeskWorkspaceRuntime.create({
    config: window.PROPERTYDESK_CONFIG || {},
    supabase: window.supabase,
    repositories: {
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
    render,
  });
  const financialContext = window.PropertyDeskWorkspaceFinancialContext.create({
    state,
    todayIso,
    postedLedgerUtils: window.PropertyDeskPostedLedgerUtils,
    isActiveAccount: window.PropertyDeskAccountStatusUtils.isActiveAccount,
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
    postedLedgerUtils: window.PropertyDeskPostedLedgerUtils,
  });
  // Feature modules receive shared state and helpers; app.js connects workflows.
  const { renderReports, attachReportExportEvents } =
    window.PropertyDeskReportWorkspaceWorkflow.create({
      rendering: {
        $,
        state,
        dateOnly,
        sumIncome,
        sumOperatingExpenses,
        accountBalance,
        esc,
        money,
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
    });
  const { previewReminderEmail } =
    window.PropertyDeskReminderPreviewWorkflow.create({
      $,
      state,
      paymentReminderMessage:
        window.PropertyDeskEmailUtils.paymentReminderMessage,
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
    });
  const appShell = window.PropertyDeskAppShellWorkflow.create({
    workspaceWorkflow: window.PropertyDeskWorkspace,
    navigationWorkflow: window.PropertyDeskNavigation,
    workspace: {
      $,
      state,
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
        money,
      },
      memberRepository: repositories.workspaceMembers,
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
      property: {
        $,
        state,
        toast,
        closeModal,
        fetchAll,
        repository: repositories.properties,
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
          EventClass: Event,
          OptionClass: Option,
          repository: repositories.transactions,
          findCorrectionTarget:
            window.PropertyDeskTransactionCorrectionModel.findCorrectionTarget,
        },
        voiding: {
          state,
          toast,
          fetchAll,
          repository: repositories.transactions,
          resolveVoidTarget:
            window.PropertyDeskTransactionVoidModel.resolveVoidTarget,
          buildVoidPayload:
            window.PropertyDeskTransactionVoidModel.buildVoidPayload,
        },
        events: { documentRef: document },
      },
      maintenanceWorkflows: {
        correction: window.PropertyDeskTransactionCorrectionWorkflow,
        voidMaintenance: window.PropertyDeskTransactionVoidMaintenance,
        voidEntry: window.PropertyDeskTransactionVoidEntry,
        events: window.PropertyDeskTransactionMaintenanceEvents,
      },
      recordWorkflows: {
        entryForms: window.PropertyDeskLedgerEntryForms,
        views: window.PropertyDeskTransactionViews,
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
        expenseAccountPolicy: window.PropertyDeskExpenseAccountPolicy,
      },
      views: {
        $,
        state,
        dateOnly,
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
    },
    accountDetailWorkspaceWorkflow:
      window.PropertyDeskAccountDetailWorkspaceWorkflow,
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
        prepareAdjustment: window.PropertyDeskDepositAdjustmentModel.prepare,
        validateAdjustment: window.PropertyDeskDepositAdjustmentModel.validate,
        resolveAdjustmentType:
          window.PropertyDeskDepositAdjustmentModel.resolveType,
      },
    },
    accountDetails: {
      content: {
        $,
        state,
        money,
        fmtDate,
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
      },
      documents: {
        workflow: window.PropertyDeskPropertyDocumentWorkflow,
        documentsWorkflow: window.PropertyDeskDocuments,
        documentEventsWorkflow: window.PropertyDeskPropertyDetailDocumentEvents,
        $,
        state,
        toast,
        fetchAll,
        documentRepository: repositories.documents,
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
      paymentStatusInMonth,
      toast,
      fetchAll,
      openPayment,
      propertyRepository: repositories.properties,
      openAccountForProperty: propertyAccountForms.openAccountForProperty,
    },
  });
  const {
    attachPreviewEvents: attachImportPreviewEvents,
    attachAccountEvents: attachAccountImportEvents,
    attachPaymentEvents: attachPaymentImportEvents,
    attachExpenseEvents: attachExpenseImportEvents,
  } = window.PropertyDeskImportFeature.create({
    $,
    state,
    esc,
    openModal,
    closeModal,
    todayIso,
    fetchAll,
    toast,
    repository: repositories.imports,
  });
  const { attachBackupExportEvents } =
    window.PropertyDeskBackupWorkspaceWorkflow.create({
      $,
      state,
      todayIso,
      toast,
      downloadBlob: window.PropertyDeskDownloadUtils.downloadBlob,
      zipUtils: window.PropertyDeskZipUtils,
      workspaceTables: window.PropertyDeskWorkspaceTables,
      loadAllPages: loadAllWorkspacePages,
      isClientReady,
      collectBackupAgreementFiles:
        window.PropertyDeskBackupAgreementFiles.collect,
      documentRepository: repositories.documents,
    });
  appLifecycle = window.PropertyDeskAppStartupWorkflow.create({
    $,
    backendConfigured,
    initializeClient,
    todayIso,
    registerShell: window.PropertyDeskPwa.registerShell,
    authClient,
    authContext: { $, state, fetchAll, toast },
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
  });
  document.addEventListener("DOMContentLoaded", appLifecycle.initialize);
})();
