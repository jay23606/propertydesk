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
    postedOnOrAfter,
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
    postedOnOrAfter,
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
  const {
    editAccount,
    updatePaymentGuidance,
    openPayment,
    openPropertyPayment,
    openExpense,
    attachEvents: attachEntryEvents,
    openAccountForProperty,
  } = window.PropertyDeskEntryWorkflow.create({
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
  const { renderPayments, attachEvents: attachTransactionEvents } =
    window.PropertyDeskTransactionWorkflow.create({
      $,
      state,
      dateOnly,
      fmtDate,
      esc,
      expenseCategoryLabel,
      money,
      monthStart,
      sumIncome,
      sumOperatingExpenses,
      postedOnOrAfter,
      toast,
      fetchAll,
      prettyType,
      openPayment,
      openExpense,
      updatePaymentGuidance,
      EventClass: Event,
      OptionClass: Option,
      documentRef: document,
    });
  const { attachEvents: attachAccountDetailsEvents, openAccountDetails } =
    window.PropertyDeskAccountDetailsWorkflow.create({
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
      sumPosted,
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
    renderOverview,
    attachOverviewEvents,
    renderProperties,
    attachPropertyPortfolioEvents,
    attachPropertyDetailsEvents,
  } = window.PropertyDeskPropertyWorkspaceWorkflow.create({
    $,
    state,
    isPosted,
    sumIncome,
    sumOperatingExpenses,
    fmtDate,
    prettyType,
    paymentFrequencyLabel,
    openModal,
    toast,
    fetchAll,
    todayIso,
    closeModal,
    editAccount,
    openPayment,
    openExpense,
    openAccountForProperty,
    openAccountDetails,
    monthlyScheduledEstimate,
    accountBalance,
    amountDueSince,
    unpaidDueAccrualStart,
    esc,
    prettyKind,
    money,
    propertyAddress,
    collectedSince,
    scheduledMonthlyRunRate,
    monthStart,
    postedOnOrAfter,
    openPropertyPayment,
    streetAddress,
    dateOnly,
    monthEnd,
    lateReminderMailto,
    paymentStatusInMonth,
  });
  const { attachCsvImportEvents, attachExportEvents } =
    window.PropertyDeskDataTransferWorkflow.create({
      $,
      state,
      esc,
      openModal,
      closeModal,
      toast,
      todayIso,
      fetchAll,
      createBackup,
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
      attachTransactionEvents,
      attachAccountDetailsEvents,
      attachEntryEvents,
      attachPropertyDetailsEvents,
      attachAuthEvents,
      attachCsvImportEvents,
      attachExportEvents,
      attachReportExportEvents,
    ],
  });
  document.addEventListener("DOMContentLoaded", appLifecycle.initialize);
})();
