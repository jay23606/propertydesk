/* PropertyDesk: static client backed by Supabase Auth, Postgres and RLS. */
(() => {
  "use strict";

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
  const { dateOnly, fmtDate, todayIso, monthStart, monthEnd } =
    window.PropertyDeskDateUtils;
  const { moneyInput } = window.PropertyDeskMoneyInputUtils;
  const {
    money,
    esc,
    prettyType,
    prettyKind,
    paymentFrequencyLabel,
    expenseCategoryLabel,
  } = window.PropertyDeskDisplayUtils;
  const { backend, state, toast, fetchAll } =
    window.PropertyDeskAppServices.create({
      $,
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
  const { renderReports, attachReportExportEvents } =
    window.PropertyDeskReportWorkflow.create({
      $,
      state,
      dateOnly,
      esc,
      money,
      sumIncome,
      sumOperatingExpenses,
      accountBalance,
      todayIso,
      prettyType,
    });
  const {
    attachEvents: attachModalEvents,
    openModal,
    closeModal,
  } = window.PropertyDeskModalController.create({
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
  const { renderReminderActivity, previewReminderEmail } =
    window.PropertyDeskReminderWorkflow.create({
      $,
      state,
      esc,
      fmtDate,
      money,
      amountDueSince,
      unpaidDueAccrualStart,
      todayIso,
      monthEnd,
      moneyInput,
      toast,
      dateOnly,
      monthStart,
      propertyAddress,
      openModal,
    });
  const {
    updateGreeting,
    navigate,
    attachEvents: attachAppShellEvents,
  } = window.PropertyDeskAppShellWorkflow.create({
    $,
    state,
    esc,
    toast,
    fetchAll,
    renderReminderActivity,
    previewReminderEmail,
  });
  const {
    entries: recordEntryWorkflow,
    transactions,
    transactionMaintenance,
  } = window.PropertyDeskLedgerWorkflow.create({
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
    navigate,
    previewReminderEmail,
    dateOnly,
    fmtDate,
    esc,
    expenseCategoryLabel,
    money,
    isPosted,
    monthStart,
    sumIncome,
    sumOperatingExpenses,
    EventClass: Event,
    OptionClass: Option,
    documentRef: document,
  });
  const {
    resetAccountForm,
    editAccount,
    openPayment,
    openPropertyPayment,
    openExpense,
    attachCreateActions,
    attachPropertyFormEvents,
    attachAccountFormEvents,
    attachLedgerEntryFormEvents,
  } = recordEntryWorkflow;
  const { renderPayments, attachEvents: attachTransactionEvents } =
    transactions;
  const { attachTransactionActionEvents } = transactionMaintenance;
  const { openAccountDetails, attachEvents: attachAccountDetailsEvents } =
    window.PropertyDeskAccountDetailsWorkflow.create({
      $,
      state,
      money,
      fmtDate,
      esc,
      isPosted,
      prettyType,
      paymentFrequencyLabel,
      accountBalance,
      amortizationSchedule,
      amountDueSince,
      unpaidDueAccrualStart,
      todayIso,
      toast,
      fetchAll,
      depositLedger,
      moneyInput,
      openModal,
      propertyAddress,
      closeModal,
      editAccount,
      openPayment,
    });
  const {
    attachPropertyDetailsEvents,
    renderOverview,
    attachOverviewEvents,
    renderProperties,
    attachPropertyPortfolioEvents,
  } = window.PropertyDeskPropertyWorkspaceWorkflow.create({
    $,
    state,
    toast,
    fetchAll,
    esc,
    money,
    fmtDate,
    prettyType,
    prettyKind,
    paymentFrequencyLabel,
    monthlyScheduledEstimate,
    accountBalance,
    amountDueSince,
    unpaidDueAccrualStart,
    todayIso,
    propertyAddress,
    streetAddress,
    collectedSince,
    scheduledMonthlyRunRate,
    monthStart,
    monthEnd,
    dateOnly,
    isPosted,
    lateReminderMailto,
    paymentStatusInMonth,
    sumIncome,
    sumOperatingExpenses,
    openModal,
    closeModal,
    openAccountDetails,
    editAccount,
    openPayment,
    openPropertyPayment,
    openExpense,
    resetAccountForm,
    populateFormOptions,
    documentRef: document,
  });
  const { attachEvents: attachCsvImportEvents } =
    window.PropertyDeskCsvImportWorkflow.create({
      $,
      state,
      esc,
      openModal,
      closeModal,
      toast,
      todayIso,
      fetchAll,
    });
  const { attachEvents: attachExportEvents } =
    window.PropertyDeskBackupExport.create({
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
  appLifecycle = window.PropertyDeskAppLifecycle.create({
    $,
    state,
    backend,
    todayIso,
    registerShell: window.PropertyDeskPwa.registerShell,
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
      attachAppShellEvents,
      attachOverviewEvents,
      attachPropertyPortfolioEvents,
      attachTransactionEvents,
      attachTransactionActionEvents,
      attachAccountDetailsEvents,
      attachCreateActions,
      attachPropertyFormEvents,
      attachAccountFormEvents,
      attachLedgerEntryFormEvents,
      attachPropertyDetailsEvents,
      attachAuthEvents,
      attachCsvImportEvents,
      attachExportEvents,
      attachReportExportEvents,
    ],
  });
  document.addEventListener("DOMContentLoaded", appLifecycle.initialize);
})();
