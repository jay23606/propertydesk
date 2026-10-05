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
  const {
    backend,
    state,
    toast,
    fetchAll,
    accountBalance,
    scheduledMonthlyRunRate,
    collectedSince,
    depositLedger,
  } = window.PropertyDeskAppServices.create({
    $, render, todayIso, scheduledLoanBalance, monthlyScheduledEstimate,
    sumPosted, securityDepositBalance,
  });
  // Feature modules receive shared state and helpers; app.js connects the workflows.
  const { updateGreeting } = window.PropertyDeskProfileDisplay.create({ $, state });
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
  const {
    resetAccountForm,
    editAccount,
    updateAllocationPreview,
    openPayment,
    openPropertyPayment,
    openExpense,
    attachPropertyFormEvents,
    attachLedgerEntryFormEvents,
    attachCreateActions,
  } = window.PropertyDeskEntryWorkflow.create({
    $, state, moneyInput, todayIso, toast, closeModal, fetchAll,
    fillSelect, populateFormOptions, prettyType, openModal, documentRef: document,
  });
  const { correctTransaction, voidTransaction } =
    window.PropertyDeskTransactionMaintenanceWorkflow.create({
      $, state, toast, fetchAll, prettyType, openPayment, openExpense,
      updateAllocationPreview, EventClass: Event, OptionClass: Option,
    });
  const {
    renderPayments,
    attachTransactionViewEvents,
    attachTransactionActionEvents,
  } = window.PropertyDeskTransactionWorkflow.create({
    $, state, dateOnly, fmtDate, esc, expenseCategoryLabel, money, isPosted,
    monthStart, sumIncome, sumOperatingExpenses, correctTransaction, voidTransaction,
  });
  const { closeAccount, recordDepositAdjustment } =
    window.PropertyDeskAccountMaintenanceWorkflow.create({
      $, state, moneyInput, todayIso, toast, fetchAll, closeModal,
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
  const { openPropertyDetails } =
    window.PropertyDeskPropertyDetailsWorkflow.create({
      $, state, isPosted, sumIncome, sumOperatingExpenses, money, fmtDate, esc,
      prettyType, paymentFrequencyLabel, accountBalance, openModal, propertyAddress,
    });
  const {
    editPropertyQuickNote,
    toggleArchiveProperty,
    attachPropertyDetailEvents,
  } = window.PropertyDeskPropertyActionsWorkflow.create({
    $, state, toast, fetchAll, todayIso, streetAddress, openPropertyDetails,
    closeModal, editAccount, openPayment, openExpense, resetAccountForm,
    populateFormOptions, openModal, openAccountDetails, documentRef: document,
  });
  const { renderOverview, attachOverviewEvents } =
    window.PropertyDeskOverviewWorkflow.create({
      $, state, monthlyScheduledEstimate, accountBalance, amountDueSince,
      unpaidDueAccrualStart, todayIso, esc, prettyKind, money, propertyAddress,
      collectedSince, scheduledMonthlyRunRate, monthStart, isPosted, prettyType,
      fmtDate, openPropertyDetails, openPropertyPayment,
    });
  const {
    renderProperties,
    attachPropertyViewEvents,
    attachPropertyActionEvents,
  } = window.PropertyDeskPropertyPortfolioWorkflow.create({
    $, state, esc, money, paymentFrequencyLabel, monthlyScheduledEstimate,
    accountBalance, amountDueSince, unpaidDueAccrualStart, todayIso,
    propertyAddress, monthStart, streetAddress, dateOnly, monthEnd,
    lateReminderMailto, paymentStatusInMonth, openPayment,
    editPropertyQuickNote, openPropertyDetails, resetAccountForm,
    populateFormOptions, openModal,
  });
  const { attachEvents: attachCsvImportEvents } =
    window.PropertyDeskCsvImportWorkflow.create({
      $, state,
      selectImportRows: window.PropertyDeskImportUtils.selectImportRows,
      parseCSV: window.PropertyDeskImportUtils.parseCSV,
      ...window.PropertyDeskImportWorkflows,
      esc, openModal, closeModal, toast, todayIso, fetchAll,
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
