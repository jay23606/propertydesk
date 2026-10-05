/* PropertyDesk: static client backed by Supabase Auth, Postgres and RLS. */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const {
    amortizationSchedule,
    amountDueSince,
    createBackup,
    isPosted,
    monthlyScheduledEstimate,
    paymentStatusInMonth,
    scheduledLoanBalance,
    securityDepositBalance,
    sumIncome,
    sumOperatingExpenses,
    sumPosted,
    unpaidDueAccrualStart,
  } = window.PropertyDeskLedgerUtils;
  const { lateReminderMailto } = window.PropertyDeskEmailUtils;
  const {
    money,
    dateOnly,
    fmtDate,
    todayIso,
    esc,
    prettyType,
    prettyKind,
    monthStart,
    monthEnd,
    propertyAddress,
    streetAddress,
    moneyInput,
    paymentFrequencyLabel,
    expenseCategoryLabel,
  } = window.PropertyDeskAppUtils;
  const workspaceData = window.PropertyDeskWorkspaceData.create();
  const config = window.PROPERTYDESK_CONFIG || {};
  const configured = Boolean(
    config.supabaseUrl && config.supabaseAnonKey && window.supabase,
  );
  const state = {
    client: null,
    user: null,
    workspaceOwnerId: null,
    workspaceMembers: [],
    propertyHolders: [],
    depositEntries: [],
    reminderLogs: [],
    view: 'properties',
    properties: [],
    accounts: [],
    payments: [],
    expenses: [],
    documents: [],
    agreementVersions: [],
    importBatches: [],
    pendingImport: null,
    pendingCorrection: null,
    editingProperty: null,
    editingAccount: null,
    selectedPropertyId: null,
    auditRequestId: 0,
    passwordRecoveryInProgress: false,
  };
  const { toast } = window.PropertyDeskNotifications.create({ $ });
  const { fetchAll } = window.PropertyDeskWorkspaceRefresh.create({
    state,
    workspaceData,
    toast,
    render,
  });
  const {
    accountBalance,
    scheduledMonthlyRunRate,
    collectedSince,
    depositLedger,
  } = window.PropertyDeskLedgerContext.create({
    state,
    todayIso,
    scheduledLoanBalance,
    monthlyScheduledEstimate,
    sumPosted,
    securityDepositBalance,
  });
  // Feature modules receive shared state and helpers; app.js connects the workflows.
  const {
    updateGreeting,
    renderOverview,
    renderProperties,
    attachEvents: attachPropertyViewEvents,
  } =
    window.PropertyDeskPropertyViews.create({
      $,
      state,
      monthlyScheduledEstimate,
      accountBalance,
      amountDueSince,
      unpaidDueAccrualStart,
      todayIso,
      esc,
      prettyKind,
      money,
      propertyAddress,
      collectedSince,
      scheduledMonthlyRunRate,
      monthStart,
      isPosted,
      prettyType,
      fmtDate,
      streetAddress,
      dateOnly,
      monthEnd,
      lateReminderMailto,
      paymentFrequencyLabel,
      paymentStatusInMonth,
    });
  const {
    renderPayments,
    renderReports,
    attachEvents: attachTransactionViewEvents,
  } =
    window.PropertyDeskTransactionViews.create({
      $,
      state,
      dateOnly,
      fmtDate,
      esc,
      expenseCategoryLabel,
      money,
      isPosted,
      monthStart,
      sumIncome,
      sumOperatingExpenses,
      accountBalance,
    });
  const {
    attachEvents: attachModalEvents,
    openModal,
    closeModal,
    fillSelect,
    populateFormOptions,
  } =
    window.PropertyDeskModalController.create({
      $,
      state,
      esc,
      propertyAddress,
      prettyType,
      documentRef: document,
    });
  const recordForms = window.PropertyDeskRecordForms.create({
    $,
    state,
    moneyInput,
    todayIso,
    toast,
    closeModal,
    fetchAll,
    fillSelect,
    populateFormOptions,
    prettyType,
    openModal,
  });
  const {
    resetPropertyForm,
    resetAccountForm,
    updateAllocationPreview,
    editAccount,
    openPayment,
    openPropertyPayment,
    openExpense,
    attachEvents: attachRecordFormEvents,
    attachCreateActions: attachRecordCreateActions,
  } = recordForms;
  const { deleteAccount: closeAccount } =
    window.PropertyDeskAccountMaintenance.create({
    $,
    state,
    toast,
    fetchAll,
    closeModal,
  });
  const { recordDepositAdjustment } =
    window.PropertyDeskDepositMaintenance.create({
      state,
      moneyInput,
      todayIso,
      toast,
      fetchAll,
      openAccountDetails: (...args) => openAccountDetails(...args),
    });
  const { correctTransaction, voidTransaction } =
    window.PropertyDeskTransactionMaintenance.create({
      $,
      state,
      toast,
      fetchAll,
      prettyType,
      openPayment,
      openExpense,
      updateAllocationPreview,
    });
  const {
    openPropertyDetails,
    openAccountDetails,
    attachPropertyEvents,
  } =
    window.PropertyDeskDetailViews.create({
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
      amortizationSchedule,
      amountDueSince,
      unpaidDueAccrualStart,
      todayIso,
      depositLedger,
      openModal,
      closeModal,
      editAccount,
      openPayment,
      openExpense,
      resetAccountForm,
      populateFormOptions,
      deleteAccount: closeAccount,
      propertyAddress,
    });
  const { attachEvents: attachImportEvents } =
    window.PropertyDeskImportFeature.create({
      $,
      state,
      parseCSV: window.PropertyDeskImportUtils.parseCSV,
      selectImportRows: window.PropertyDeskImportUtils.selectImportRows,
      ...window.PropertyDeskImportWorkflows,
      esc,
      todayIso,
      openModal,
      closeModal,
      fetchAll,
      toast,
    });
  const {
    uploadPropertyDocument,
    deletePropertyDocument,
    openPropertyDocument,
  } = window.PropertyDeskDocuments.create({
    state,
    toast,
    fetchAll,
    openPropertyDetails,
  });
  const { attachEvents: attachExportEvents } =
    window.PropertyDeskExports.create({
      $,
      state,
      createBackup,
      todayIso,
      toast,
      prettyType,
      accountBalance,
    });
  const {
    showConfigError,
    setAuthMode,
    handleAuthStateChange,
    restoreAuthSession,
    attachEvents: attachAuthEvents,
  } = window.PropertyDeskAuth.create({ $, state, fetchAll, toast });
  const {
    removeWorkspaceMember,
    renderWorkspaceSettings,
    attachEvents: attachWorkspaceEvents,
  } = window.PropertyDeskWorkspace.create({
    $,
    state,
    esc,
    fmtDate,
    money,
    toast,
    fetchAll,
    updateGreeting,
  });
  const { previewReminderEmail } = window.PropertyDeskReminderPreview.create({
    $,
    state,
    amountDueSince,
    unpaidDueAccrualStart,
    todayIso,
    monthEnd,
    moneyInput,
    toast,
    dateOnly,
    monthStart,
    propertyAddress,
    money,
    esc,
    openModal,
  });
  const { navigate, attachEvents: attachNavigationEvents } =
    window.PropertyDeskNavigation.create({
      $,
      state,
      renderWorkspaceSettings,
      closeModal,
    });
  const { editPropertyQuickNote, savePropertyHolders, toggleArchiveProperty } =
    window.PropertyDeskPropertyManagement.create({
      $,
      state,
      toast,
      fetchAll,
      todayIso,
      streetAddress,
      openPropertyDetails,
    });
  const { attachEvents: attachActionRouterEvents } =
    window.PropertyDeskActionRouter.create({
      $,
      recordDepositAdjustment,
      removeWorkspaceMember,
      savePropertyHolders,
      openPayment,
      resetAccountForm,
      populateFormOptions,
      openModal,
      editPropertyQuickNote,
      openPropertyDetails,
      openPropertyPayment,
      deletePropertyDocument,
      openPropertyDocument,
      correctTransaction,
      voidTransaction,
      closeModal,
      openAccountDetails,
      uploadPropertyDocument,
    });

  function render() {
    updateGreeting();
    renderOverview();
    renderProperties();
    renderPayments();
    renderReports();
  }
  function attachEvents() {
    attachModalEvents();
    attachNavigationEvents();
    attachPropertyViewEvents();
    attachTransactionViewEvents();
    attachRecordCreateActions(navigate);
    attachRecordFormEvents(previewReminderEmail);
    attachActionRouterEvents();
    attachPropertyEvents(toggleArchiveProperty);
    attachWorkspaceEvents();
    attachAuthEvents();
    attachImportEvents();
    attachExportEvents();
  }
  async function init() {
    attachEvents();
    $('payment-date').value = todayIso();
    $('account-start').value = todayIso();
    setAuthMode(false);
    window.PropertyDeskPwa.registerShell();

    if (!configured) {
      showConfigError();
      return;
    }

    state.client = window.supabase.createClient(
      config.supabaseUrl,
      config.supabaseAnonKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      },
    );
    state.client.auth.onAuthStateChange(handleAuthStateChange);
    await restoreAuthSession();
  }
  document.addEventListener('DOMContentLoaded', init);
})();
