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
  const { toast } = window.PropertyDeskNotifications.create({ $ });
  const { backend, state, fetchAll } = window.PropertyDeskAppServices.create({
    render,
    toast,
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
  // Feature modules receive shared state and helpers; app.js connects workflows.
  const { renderReports, attachReportExportEvents } =
    window.PropertyDeskReportsWorkflow.create({
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
  const { attachEvents: attachThemeEvents } = window.PropertyDeskTheme.create();
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
  });
  const entryWorkflow = window.PropertyDeskEntryWorkflow.create({
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
    previewReminderEmail,
    navigate,
    documentRef: document,
  });
  const {
    editAccount,
    openPayment,
    openPropertyPayment,
    openExpense,
    attachPropertyFormEvents,
    attachAccountFormEvents,
    attachLedgerEntryFormEvents,
    attachCreateActions,
    openAccountForProperty,
  } = entryWorkflow;
  const {
    renderPayments,
    attachTransactionEvents,
    attachTransactionActionEvents,
  } = window.PropertyDeskTransactionWorkflow.create({
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
    toast,
    fetchAll,
    prettyType,
    openPayment,
    openExpense,
    updateAllocationPreview: entryWorkflow.updateAllocationPreview,
    EventClass: Event,
    OptionClass: Option,
    documentRef: document,
  });
  const {
    attachAccountDetailActionEvents,
    attachDepositEvents,
    openAccountDetails,
  } = window.PropertyDeskAccountDetailsWorkflow.create({
    $,
    state,
    toast,
    fetchAll,
    money,
    moneyInput,
    todayIso,
    depositLedger,
    fmtDate,
    esc,
    closeModal,
    editAccount,
    openPayment,
    isPosted,
    prettyType,
    paymentFrequencyLabel,
    accountBalance,
    amortizationSchedule,
    amountDueSince,
    unpaidDueAccrualStart,
    openModal,
    propertyAddress,
  });
  const {
    openPropertyDetails,
    attachPropertyDetailEvents: attachPropertyDetailsEvents,
    attachPropertyDocumentEvents,
  } = window.PropertyDeskPropertyDetailsWorkflow.create({
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
    toast,
    fetchAll,
    todayIso,
    closeModal,
    editAccount,
    openPayment,
    openExpense,
    openAccountForProperty,
    openAccountDetails,
    documentRef: document,
  });
  const { renderOverview, attachOverviewEvents } =
    window.PropertyDeskOverviewWorkflow.create({
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
      openPropertyDetails,
      openPropertyPayment,
    });
  const {
    renderProperties,
    attachPortfolioEvents: attachPropertyPortfolioEvents,
    attachPortfolioActionEvents: attachPropertyPortfolioActionEvents,
  } = window.PropertyDeskPropertyPortfolioScreenWorkflow.create({
    $,
    state,
    esc,
    money,
    paymentFrequencyLabel,
    monthlyScheduledEstimate,
    accountBalance,
    amountDueSince,
    unpaidDueAccrualStart,
    todayIso,
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
    openPropertyDetails,
    openAccountForProperty,
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
      attachThemeEvents,
      attachAppShellEvents,
      attachOverviewEvents,
      attachPropertyPortfolioEvents,
      attachPropertyPortfolioActionEvents,
      attachTransactionEvents,
      attachTransactionActionEvents,
      attachAccountDetailActionEvents,
      attachDepositEvents,
      attachCreateActions,
      attachPropertyFormEvents,
      attachAccountFormEvents,
      attachLedgerEntryFormEvents,
      attachPropertyDetailsEvents,
      attachPropertyDocumentEvents,
      attachAuthEvents,
      attachCsvImportEvents,
      attachExportEvents,
      attachReportExportEvents,
    ],
  });
  document.addEventListener("DOMContentLoaded", appLifecycle.initialize);
})();
