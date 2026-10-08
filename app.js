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
  const { renderReports } = window.PropertyDeskReportWorkflow.create({
    $,
    state,
    dateOnly,
    sumIncome,
    sumOperatingExpenses,
    accountBalance,
    esc,
    money,
  });
  const { attachEvents: attachReportExportEvents } =
    window.PropertyDeskReportExport.create({
      $,
      state,
      todayIso,
      prettyType,
      accountBalance,
      downloadBlob: window.PropertyDeskDownloadUtils.downloadBlob,
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
    });
  const appShell = window.PropertyDeskAppShellWorkflow.create({
    workspace: {
      $,
      state,
      esc,
      toast,
      fetchAll,
      reminder: {
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
        formModel: window.PropertyDeskAccountFormModel,
        repository: repositories.accounts,
      },
    });
  const transactionRecords =
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
  } = transactionRecords;
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
  const depositWorkspace = window.PropertyDeskDepositWorkspaceWorkflow.create({
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
    },
  });
  const { openAccountDetails, attachAccountDetailActionEvents } =
    window.PropertyDeskAccountDetailWorkspaceWorkflow.create({
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
        depositSectionHTML: depositWorkspace.depositSectionHTML,
        accountHistoryRepository: repositories.accountHistory,
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
    });
  const { attachDepositAdjustmentEvents } = depositWorkspace;
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
