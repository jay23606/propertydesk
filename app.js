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
  const { createBackup } = window.PropertyDeskBackupUtils;
  const { lateReminderMailto } = window.PropertyDeskEmailUtils;
  const { propertyAddress, streetAddress } =
    window.PropertyDeskPropertyAddressUtils;
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
    attachAccountFormEvents,
    attachLedgerEntryFormEvents,
    attachCreateActions,
  } = window.PropertyDeskEntryWorkflow.create({
    $, state, moneyInput, todayIso, toast, closeModal, fetchAll,
    fillSelect, populateFormOptions, prettyType, openModal, documentRef: document,
  });
  const { attachTransactionActionEvents } =
    window.PropertyDeskTransactionMaintenanceWorkflow.create({
      $, state, toast, fetchAll, prettyType, openPayment, openExpense,
      updateAllocationPreview, EventClass: Event, OptionClass: Option,
      documentRef: document,
    });
  const {
    renderPayments,
    attachTransactionViewEvents,
  } = window.PropertyDeskTransactionWorkflow.create({
    $, state, dateOnly, fmtDate, esc, expenseCategoryLabel, money, isPosted,
    monthStart, sumIncome, sumOperatingExpenses,
  });
  const { closeAccount } =
    window.PropertyDeskAccountMaintenanceWorkflow.create({
      $, state, toast, fetchAll, closeModal,
    });
  const { depositSectionHTML, attachDepositDetailEvents } =
    window.PropertyDeskDepositDetailsWorkflow.create({
      $, state, depositLedger, money, fmtDate, esc, moneyInput, todayIso,
      toast, fetchAll,
    });
  const {
    openAccountDetails,
    attachAccountDetailEvents,
  } = window.PropertyDeskAccountDetailsWorkflow.create({
    $, state, money, fmtDate, esc, isPosted, prettyType,
    paymentFrequencyLabel, accountBalance, amortizationSchedule, amountDueSince,
    unpaidDueAccrualStart, todayIso, openModal, propertyAddress, closeModal,
    editAccount, openPayment, closeAccount, depositSectionHTML,
  });
  const { openPropertyDetails } =
    window.PropertyDeskPropertyDetailsWorkflow.create({
      $, state, isPosted, sumIncome, sumOperatingExpenses, money, fmtDate, esc,
      prettyType, paymentFrequencyLabel, accountBalance, openModal, propertyAddress,
    });
  const { attachPropertyDetailEvents } =
    window.PropertyDeskPropertyDetailActionsWorkflow.create({
      $, state, toast, fetchAll, todayIso, openPropertyDetails,
      closeModal, editAccount, openPayment, openExpense, resetAccountForm,
      populateFormOptions, openModal, openAccountDetails, documentRef: document,
    });
  const { attachPropertyDocumentEvents } =
    window.PropertyDeskPropertyDocumentWorkflow.create({
      $, state, toast, fetchAll, openPropertyDetails,
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
    $, state, toast, fetchAll, esc, money, paymentFrequencyLabel, monthlyScheduledEstimate,
    accountBalance, amountDueSince, unpaidDueAccrualStart, todayIso,
    propertyAddress, monthStart, streetAddress, dateOnly, monthEnd,
    lateReminderMailto, paymentStatusInMonth, openPayment,
    openPropertyDetails, resetAccountForm,
    populateFormOptions, openModal,
  });
  const { attachEvents: attachCsvImportEvents } =
    window.PropertyDeskCsvImportWorkflow.create({
      $, state,
      selectImportRows: window.PropertyDeskImportUtils.selectImportRows,
      parseCSV: window.PropertyDeskImportUtils.parseCSV,
      validateAccountRows: window.PropertyDeskImportWorkflows.validateAccountRows,
      validatePaymentRows: window.PropertyDeskImportWorkflows.validatePaymentRows,
      validateExpenseRows: window.PropertyDeskImportWorkflows.validateExpenseRows,
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
  const { renderReminderActivity, previewReminderEmail } =
    window.PropertyDeskReminderWorkflow.create({
      $, state, esc, fmtDate, money, amountDueSince, unpaidDueAccrualStart,
      todayIso, monthEnd, moneyInput, toast, dateOnly, monthStart,
      propertyAddress, openModal,
    });
  const {
    navigate,
    attachWorkspaceEvents,
    attachNavigationEvents,
    attachThemeEvents,
  } = window.PropertyDeskAppShellWorkflow.create({
    $, state, esc, toast, fetchAll, updateGreeting, renderReminderActivity,
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
      attachPropertyFormEvents,
      () => attachAccountFormEvents(previewReminderEmail),
      attachLedgerEntryFormEvents,
      attachPropertyDetailEvents,
      attachPropertyDocumentEvents,
      attachWorkspaceEvents,
      attachAuthEvents,
      attachCsvImportEvents,
      attachExportEvents,
      attachReportExportEvents,
    ],
  });
  document.addEventListener('DOMContentLoaded', appLifecycle.initialize);
})();
