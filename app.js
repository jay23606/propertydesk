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
    $,
    render,
    todayIso,
    scheduledLoanBalance,
    monthlyScheduledEstimate,
    sumPosted,
    securityDepositBalance,
  });
  // Feature modules receive shared state and helpers; app.js connects the workflows.
  const { updateGreeting } = window.PropertyDeskProfileDisplay.create({
    $,
    state,
  });
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
  const { saveCorrection } = window.PropertyDeskTransactionCorrections.create({
    $,
    state,
    toast,
    fetchAll,
    closeModal,
  });
  const recordEntryWorkflow = window.PropertyDeskRecordEntryWorkflow.create({
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
    saveCorrection,
    documentRef: document,
  });
  const {
    resetAccountForm,
    editAccount,
    updateAllocationPreview,
    openPayment,
    openPropertyPayment,
    openExpense,
    attachCreateActions,
    attachPropertyFormEvents,
    attachAccountFormEvents,
    attachLedgerEntryFormEvents,
  } = recordEntryWorkflow;
  const { renderPayments, attachEvents: attachTransactionEvents } =
    window.PropertyDeskTransactionWorkflow.create({
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
      updateAllocationPreview,
      EventClass: Event,
      OptionClass: Option,
      documentRef: document,
    });
  const depositWorkflow = window.PropertyDeskDepositWorkflow.create({
    $,
    state,
    depositLedger,
    money,
    fmtDate,
    esc,
    moneyInput,
    todayIso,
    toast,
    fetchAll,
  });
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
      depositSectionHTML: depositWorkflow.depositSectionHTML,
      attachDepositEvents: depositWorkflow.attachEvents,
      openModal,
      propertyAddress,
      closeModal,
      editAccount,
      openPayment,
    });
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
      toast,
      fetchAll,
      esc,
      money,
      paymentFrequencyLabel,
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
      selectImportRows: window.PropertyDeskImportUtils.selectImportRows,
      parseCSV: window.PropertyDeskImportUtils.parseCSV,
      validateAccountRows:
        window.PropertyDeskImportWorkflows.validateAccountRows,
      validatePaymentRows:
        window.PropertyDeskImportWorkflows.validatePaymentRows,
      validateExpenseRows:
        window.PropertyDeskImportWorkflows.validateExpenseRows,
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
  const { navigate, attachEvents: attachAppShellEvents } =
    window.PropertyDeskAppShellWorkflow.create({
      $,
      state,
      esc,
      toast,
      fetchAll,
      updateGreeting,
      renderReminderActivity,
    });
  appLifecycle = window.PropertyDeskAppLifecycle.create({
    $,
    state,
    backend,
    todayIso,
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
      attachAppShellEvents,
      attachOverviewEvents,
      attachPropertyPortfolioEvents,
      attachTransactionEvents,
      attachAccountDetailsEvents,
      () => attachCreateActions(navigate),
      attachPropertyFormEvents,
      () => attachAccountFormEvents(previewReminderEmail),
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
