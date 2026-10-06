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
  const { renderReports } = window.PropertyDeskReportWorkflow.create({
    $,
    state,
    dateOnly,
    esc,
    money,
    sumIncome,
    sumOperatingExpenses,
    accountBalance,
  });
  const { attachEvents: attachReportExportEvents } =
    window.PropertyDeskReportExport.create({
      $,
      state,
      todayIso,
      prettyType,
      accountBalance,
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
      openModal: modal.openModal,
    });
  const { attachEvents: attachModalEvents, openModal, closeModal } = modal;
  const { attachEvents: attachThemeEvents } = window.PropertyDeskTheme.create();
  const workspace = window.PropertyDeskWorkspace.create({
    $,
    state,
    esc,
    toast,
    fetchAll,
  });
  const { updateGreeting } = workspace;
  function renderWorkspaceSettings() {
    workspace.renderWorkspaceSettings();
    renderReminderActivity();
  }
  const { navigate, attachEvents: attachNavigationEvents } =
    window.PropertyDeskNavigation.create({ $, state, renderWorkspaceSettings });
  function attachAppShellEvents() {
    attachNavigationEvents();
    workspace.attachEvents();
  }
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
  const { renderPayments, attachEvents: attachTransactionViewEvents } =
    window.PropertyDeskTransactionViews.create({
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
    });
  const { attachTransactionActionEvents } =
    window.PropertyDeskTransactionMaintenanceWorkflow.create({
      $,
      state,
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
  function attachTransactionEvents() {
    attachTransactionViewEvents();
    attachTransactionActionEvents();
  }
  const { depositSectionHTML } = window.PropertyDeskDepositDetails.create({
    state,
    depositLedger,
    money,
    fmtDate,
    esc,
  });
  const { attachEvents: attachDepositEvents } =
    window.PropertyDeskDepositMaintenanceWorkflow.create({
      $,
      state,
      moneyInput,
      todayIso,
      toast,
      fetchAll,
      depositSectionHTML,
    });
  const { attachEvents: attachAccountDetailActionEvents } =
    window.PropertyDeskAccountDetailActionsWorkflow.create({
      $,
      state,
      toast,
      fetchAll,
      closeModal,
      editAccount,
      openPayment,
    });
  const { renderAccountHistory } =
    window.PropertyDeskAccountHistoryDetails.create({
      state,
      esc,
      money,
      fmtDate,
    });
  const { openAccountDetails } =
    window.PropertyDeskAccountDetailContentWorkflow.create({
      $,
      state,
      money,
      fmtDate,
      esc,
      sumPosted,
      prettyType,
      paymentFrequencyLabel,
      accountBalance,
      amortizationSchedule,
      amountDueSince,
      unpaidDueAccrualStart,
      todayIso,
      openModal,
      propertyAddress,
      depositSectionHTML,
      renderAccountHistory,
    });
  function attachAccountDetailsEvents() {
    attachAccountDetailActionEvents();
    attachDepositEvents();
  }
  const { openPropertyDetails, attachEvents: attachPropertyDetailsEvents } =
    window.PropertyDeskPropertyDetailsWorkflow.create({
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
      postedOnOrAfter,
      prettyType,
      fmtDate,
      openPropertyDetails,
      openPropertyPayment,
    });
  const { renderProperties, attachEvents: attachPropertyPortfolioEvents } =
    window.PropertyDeskPropertyPortfolioScreenWorkflow.create({
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
