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
  const { updateGreeting } = window.PropertyDeskProfileDisplay.create({ $, state });
  const { renderOverview } = window.PropertyDeskOverview.create({
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
  const { attachEvents: attachOverviewEvents } =
    window.PropertyDeskOverviewEvents.create({
      $,
      openPropertyDetails: (...args) => openPropertyDetails(...args),
      openPropertyPayment: (...args) => openPropertyPayment(...args),
    });
  const portfolioTable = window.PropertyDeskPropertyPortfolioTable.create({
    esc,
    money,
    paymentFrequencyLabel,
  });
  const portfolioModel = window.PropertyDeskPropertyPortfolioModel.create({
    state,
    monthlyScheduledEstimate,
    accountBalance,
    amountDueSince,
    unpaidDueAccrualStart,
    todayIso,
    propertyAddress,
    monthStart,
    streetAddress,
    dateOnly,
    monthEnd,
    lateReminderMailto,
    paymentStatusInMonth,
    money,
  });
  const {
    renderProperties,
    attachEvents: attachPropertyViewEvents,
  } = window.PropertyDeskPropertyViews.create({
    $,
    state,
    esc,
    portfolioTable,
    portfolioModel,
  });
  const { attachEvents: attachPropertyActionEvents } =
    window.PropertyDeskPropertyViewEvents.create({
      $,
      openPayment: (...args) => openPayment(...args),
      editPropertyQuickNote: (...args) => editPropertyQuickNote(...args),
      openPropertyDetails: (...args) => openPropertyDetails(...args),
      resetAccountForm: (...args) => resetAccountForm(...args),
      populateFormOptions: (...args) => populateFormOptions(...args),
      openModal: (...args) => openModal(...args),
    });
  const { renderReports, attachReportExportEvents } = window.PropertyDeskReportWorkflow.create({
    $, state, dateOnly, esc, money, sumIncome, sumOperatingExpenses,
    accountBalance, todayIso, prettyType,
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
  const { saveCorrection } =
    window.PropertyDeskTransactionCorrections.create({
      $,
      state,
      toast,
      fetchAll,
      closeModal,
    });
  const {
    closeAccount,
    recordDepositAdjustment,
    voidTransaction,
  } = window.PropertyDeskRecordMaintenance.create({
    $, state, moneyInput, todayIso, toast, fetchAll, closeModal,
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
    saveCorrection,
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
  const {
    renderPayments,
    attachTransactionViewEvents,
    attachTransactionActionEvents,
  } = window.PropertyDeskTransactionWorkflow.create({
    $, state, dateOnly, fmtDate, esc, expenseCategoryLabel, money, isPosted,
    monthStart, sumIncome, sumOperatingExpenses, toast, prettyType, openPayment,
    openExpense, updateAllocationPreview, EventClass: Event, OptionClass: Option,
    voidTransaction,
  });
  const { attachEvents: attachCreateActions } =
    window.PropertyDeskCreateActions.create({
      $,
      state,
      toast,
      resetPropertyForm,
      resetAccountForm,
      populateFormOptions,
      openModal,
      openPayment,
      openExpense,
      documentRef: document,
    });
  const {
    openAccountDetails,
    attachAccountDetailEvents,
    attachDepositDetailEvents,
  } = window.PropertyDeskAccountDetailsWorkflow.create({
    $, state, depositLedger, money, fmtDate, esc, isPosted, prettyType,
    paymentFrequencyLabel, accountBalance, amortizationSchedule, amountDueSince,
    unpaidDueAccrualStart, todayIso, openModal, propertyAddress, closeModal,
    editAccount, openPayment, closeAccount, recordDepositAdjustment,
  });
  const { renderPropertyActivity } =
    window.PropertyDeskPropertyActivityDetails.create({
      state,
      isPosted,
      sumIncome,
      sumOperatingExpenses,
      money,
      fmtDate,
      esc,
    });
  const { openPropertyDetails } =
    window.PropertyDeskPropertyDetails.create({
      $,
      state,
      money,
      fmtDate,
      esc,
      prettyType,
      paymentFrequencyLabel,
      accountBalance,
      openModal,
      propertyAddress,
      renderPropertyActivity,
    });
  const { attachEvents: attachPropertyDetailEvents } =
    window.PropertyDeskPropertyDetailEvents.create({
      $,
      state,
      closeModal,
      editAccount,
      openPayment,
      openExpense,
      resetAccountForm,
      populateFormOptions,
      openModal,
      savePropertyHolders: () => savePropertyHolders(),
      openAccountDetails: (...args) => openAccountDetails(...args),
      deletePropertyDocument: (...args) => deletePropertyDocument(...args),
      openPropertyDocument: (...args) => openPropertyDocument(...args),
      uploadPropertyDocument: (...args) => uploadPropertyDocument(...args),
    });
  const { attachEvents: attachCsvImportEvents } =
    window.PropertyDeskCsvImportWorkflow.create({
      $, state,
      selectImportRows: window.PropertyDeskImportUtils.selectImportRows,
      parseCSV: window.PropertyDeskImportUtils.parseCSV,
      ...window.PropertyDeskImportWorkflows,
      esc, openModal, closeModal, toast, todayIso, fetchAll,
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
    });
  const {
    showConfigError,
    setAuthMode,
    handleAuthStateChange,
    restoreAuthSession,
    attachEvents: attachAuthEvents,
  } = window.PropertyDeskAuth.create({ $, state, fetchAll, toast });
  const {
    renderWorkspaceSettings,
    attachWorkspaceEvents,
    previewReminderEmail,
  } = window.PropertyDeskWorkspaceSettingsWorkflow.create({
    $, state, esc, fmtDate, money, toast, fetchAll, updateGreeting,
    amountDueSince, unpaidDueAccrualStart, todayIso, monthEnd, moneyInput,
    dateOnly, monthStart, propertyAddress, openModal,
  });
  const { navigate, attachEvents: attachNavigationEvents } =
    window.PropertyDeskNavigation.create({
      $,
      state,
      renderWorkspaceSettings,
    });
  const { attachEvents: attachThemeEvents } =
    window.PropertyDeskTheme.create();
  const { editPropertyQuickNote } = window.PropertyDeskPropertyQuickNote.create({
    state,
    toast,
    fetchAll,
    streetAddress,
  });
  const { savePropertyHolders, toggleArchiveProperty } =
    window.PropertyDeskPropertyManagement.create({
      state,
      toast,
      fetchAll,
      todayIso,
      openPropertyDetails,
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
      attachThemeEvents,
      attachNavigationEvents,
      attachOverviewEvents,
      attachPropertyViewEvents,
      attachPropertyActionEvents,
      attachTransactionViewEvents,
      attachTransactionActionEvents,
      attachDepositDetailEvents,
      attachAccountDetailEvents,
      () => attachCreateActions(navigate),
      () => attachPropertyFormEvents(previewReminderEmail),
      attachLedgerEntryFormEvents,
      () => attachPropertyDetailEvents(toggleArchiveProperty),
      attachWorkspaceEvents,
      attachAuthEvents,
      attachCsvImportEvents,
      attachExportEvents,
      attachReportExportEvents,
    ],
  });
  document.addEventListener('DOMContentLoaded', appLifecycle.initialize);
})();
