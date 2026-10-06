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
  // Feature modules receive shared state and helpers; app.js connects the workflows.
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
  const { entries: recordEntryWorkflow, transactions } =
    window.PropertyDeskLedgerWorkflow.create({
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
      dateOnly,
      fmtDate,
      esc,
      expenseCategoryLabel,
      money,
      isPosted,
      monthStart,
      sumIncome,
      sumOperatingExpenses,
    });
  const {
    resetPropertyForm,
    resetAccountForm,
    editAccount,
    openPayment,
    openPropertyPayment,
    openExpense,
    attachPropertyFormEvents,
    attachAccountFormEvents,
    attachLedgerEntryFormEvents,
  } = recordEntryWorkflow;
  const { attachEvents: attachCreateActions } =
    window.PropertyDeskCreateActions.create({
      $,
      state,
      toast,
      resetPropertyForm,
      resetAccountForm,
      populateFormOptions,
      openModal,
      navigate,
      openPayment,
      openExpense,
      documentRef: document,
    });
  const { renderPayments, attachEvents: attachTransactionEvents } =
    transactions;
  const { attachTransactionActionEvents } =
    window.PropertyDeskTransactionMaintenanceWorkflow.create({
      $,
      state,
      toast,
      fetchAll,
      prettyType,
      openPayment,
      openExpense,
      updateAllocationPreview: recordEntryWorkflow.updateAllocationPreview,
      EventClass: Event,
      OptionClass: Option,
      documentRef: document,
    });
  const { depositSectionHTML } =
    window.PropertyDeskDepositDetailsWorkflow.create({
      $,
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
  const { openAccountDetails } =
    window.PropertyDeskAccountDetailContentWorkflow.create({
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
      depositSectionHTML,
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
    resetAccountForm,
    populateFormOptions,
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
  const { renderProperties, attachEvents: attachPropertyPortfolioEvents } =
    window.PropertyDeskPropertyPortfolioWorkflow.create({
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
    });
  const { attachEvents: attachPropertyPortfolioActionEvents } =
    window.PropertyDeskPropertyPortfolioActionsWorkflow.create({
      $,
      state,
      toast,
      fetchAll,
      streetAddress,
      openPayment,
      openPropertyDetails,
      resetAccountForm,
      populateFormOptions,
      openModal,
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
