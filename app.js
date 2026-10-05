/* PropertyDesk: static client backed by Supabase Auth, Postgres and RLS. */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  let appLifecycle;
  function render() {
    appLifecycle.render();
  }
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
  const backend = window.PropertyDeskBackendClient.create({
    config,
    supabase: window.supabase,
  });
  const state = window.PropertyDeskAppState.create();
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
  const { updateGreeting, renderOverview } = window.PropertyDeskOverview.create({
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
  });
  const {
    renderProperties,
    attachEvents: attachPropertyViewEvents,
  } = window.PropertyDeskPropertyViews.create({
      $,
      state,
      monthlyScheduledEstimate,
      accountBalance,
      amountDueSince,
      unpaidDueAccrualStart,
      todayIso,
      esc,
      money,
      propertyAddress,
      monthStart,
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
  const propertyAccountForms = window.PropertyDeskPropertyAccountForms.create({
    $,
    state,
    moneyInput,
    todayIso,
    toast,
    closeModal,
    fetchAll,
    populateFormOptions,
    openModal,
  });
  const ledgerEntryForms = window.PropertyDeskLedgerEntryForms.create({
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
    editAccount,
    attachEvents: attachPropertyFormEvents,
  } = propertyAccountForms;
  const {
    updateAllocationPreview,
    openPayment,
    openPropertyPayment,
    openExpense,
    attachEvents: attachLedgerEntryFormEvents,
  } = ledgerEntryForms;
  const { attachEvents: attachCreateActions } =
    window.PropertyDeskCreateActions.create({
      $,
      state,
      todayIso,
      toast,
      resetPropertyForm,
      resetAccountForm,
      populateFormOptions,
      openModal,
      openPayment,
      openExpense,
      documentRef: document,
    });
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
  const { openPropertyDetails, attachPropertyEvents } =
    window.PropertyDeskPropertyDetails.create({
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
      closeModal,
      editAccount,
      openPayment,
      resetAccountForm,
      populateFormOptions,
      propertyAddress,
    });
  const { openAccountDetails } = window.PropertyDeskAccountDetails.create({
    $,
    state,
    isPosted,
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
    deleteAccount: closeAccount,
    propertyAddress,
  });
  const importPreview = window.PropertyDeskImportPreview.create({
    $,
    state,
    selectImportRows: window.PropertyDeskImportUtils.selectImportRows,
    esc,
    openModal,
    closeModal,
    toast,
  });
  const { stageImport, attachEvents: attachImportPreviewEvents } = importPreview;
  const { attachEvents: attachImportEvents } =
    window.PropertyDeskImportFeature.create({
      $,
      state,
      stageImport,
      parseCSV: window.PropertyDeskImportUtils.parseCSV,
      ...window.PropertyDeskImportWorkflows,
      todayIso,
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

  appLifecycle = window.PropertyDeskAppLifecycle.create({
    $, state, backend, todayIso,
    registerShell: () => window.PropertyDeskPwa.registerShell(),
    auth: {
      setAuthMode,
      showConfigError,
      handleAuthStateChange,
      restoreAuthSession,
    },
    renderers: [
      updateGreeting,
      renderOverview,
      renderProperties,
      renderPayments,
      renderReports,
    ],
    eventBinders: [
      attachModalEvents,
      attachNavigationEvents,
      attachPropertyViewEvents,
      attachTransactionViewEvents,
      () => attachCreateActions(navigate),
      () => attachPropertyFormEvents(previewReminderEmail),
      attachLedgerEntryFormEvents,
      attachActionRouterEvents,
      () => attachPropertyEvents(toggleArchiveProperty),
      attachWorkspaceEvents,
      attachAuthEvents,
      attachImportPreviewEvents,
      attachImportEvents,
      attachExportEvents,
    ],
  });
  document.addEventListener('DOMContentLoaded', appLifecycle.initialize);
})();
