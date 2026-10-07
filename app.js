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
  const backend = window.PropertyDeskBackendClient.create({
    config: window.PROPERTYDESK_CONFIG || {},
    supabase: window.supabase,
  });
  const state = window.PropertyDeskAppState.create();
  const { fetchAll } = window.PropertyDeskWorkspaceRefresh.create({
    state,
    workspaceData: window.PropertyDeskWorkspaceData.create(),
    toast,
    render,
  });
  const { accountBalance, scheduledMonthlyRunRate, collectedSince } =
    window.PropertyDeskLedgerContext.create({
      state,
      todayIso,
      scheduledLoanBalance,
      monthlyScheduledEstimate,
      postedOnOrAfter,
      sumPosted,
    });
  const { depositLedger } = window.PropertyDeskDepositContext.create({
    state,
    securityDepositBalance,
  });
  // Feature modules receive shared state and helpers; app.js connects workflows.
  const { renderReports, attachReportExportEvents } =
    window.PropertyDeskReportWorkflow.create({
      $,
      state,
      dateOnly,
      sumIncome,
      sumOperatingExpenses,
      accountBalance,
      esc,
      money,
      todayIso,
      prettyType,
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
    window.PropertyDeskWorkspaceReminderWorkflow.create({
      $,
      state,
      esc,
      fmtDate,
      money,
      amountDueSince,
      unpaidDueAccrualStart,
      monthEnd,
      dateOnly,
      monthStart,
      propertyAddress,
      todayIso,
      moneyInput,
      toast,
      openModal: modal.openModal,
    });
  const { attachEvents: attachModalEvents, openModal, closeModal } = modal;
  const { attachEvents: attachThemeEvents } = window.PropertyDeskTheme.create();
  const {
    updateGreeting,
    attachProfileEvents,
    attachWorkspaceMemberEvents,
    navigate,
    attachNavigationEvents,
  } = window.PropertyDeskWorkspaceNavigationWorkflow.create({
    $,
    state,
    esc,
    toast,
    fetchAll,
    renderReminderActivity,
    documentRef: document,
    windowRef: window,
  });
  const transactionMaintenance =
    window.PropertyDeskTransactionMaintenanceWorkflow.create({
      $,
      state,
      toast,
      fetchAll,
      closeModal,
      prettyType,
      EventClass: Event,
      OptionClass: Option,
      documentRef: document,
    });
  const { saveCorrection } = transactionMaintenance;
  const {
    editAccount,
    openAccountForProperty,
    updatePaymentGuidance,
    openPayment,
    openPropertyPayment,
    openExpense,
    attachPropertyFormEvents,
    attachAccountFormEvents,
    attachLedgerEntryFormEvents,
    resetPropertyForm,
  } = window.PropertyDeskRecordEntryWorkflow.create({
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
    saveCorrection,
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
      postedOnOrAfter,
      monthStart,
      sumIncome,
      sumOperatingExpenses,
    });
  const { attachEvents: attachCreateActionEvents } =
    window.PropertyDeskCreateActions.create({
      $,
      state,
      toast,
      resetPropertyForm,
      openModal,
      openAccountForProperty,
      openPayment,
      openExpense,
      navigate,
      documentRef: document,
    });
  const { attachEvents: attachTransactionActionEvents } =
    transactionMaintenance.createActionHandlers({
      openPayment,
      openExpense,
      updatePaymentGuidance,
    });
  const { openAccountDetails, depositSectionHTML } =
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
      depositLedger,
    });
  const { attachDepositEvents, attachAccountDetailActionEvents } =
    window.PropertyDeskAccountDepositMaintenanceWorkflow.create({
      $,
      state,
      todayIso,
      toast,
      fetchAll,
      closeModal,
      editAccount,
      openPayment,
      depositSectionHTML,
      moneyInput,
    });
  const { openPropertyDetails } =
    window.PropertyDeskPropertyDetailContentWorkflow.create({
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
    });
  const {
    attachPropertyDetailEvents,
    attachPropertyQuickActionEvents,
    attachPropertyHolderEvents,
    attachPropertyDocumentEvents,
  } = window.PropertyDeskPropertyDetailManagementWorkflow.create({
    $,
    state,
    toast,
    fetchAll,
    todayIso,
    openPropertyDetails,
    closeModal,
    editAccount,
    openAccountDetails,
    openPayment,
    openExpense,
    openAccountForProperty,
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
      collectedSince,
      scheduledMonthlyRunRate,
      monthStart,
      isPosted,
      postedOnOrAfter,
      esc,
      money,
      propertyAddress,
      prettyKind,
      prettyType,
      fmtDate,
      openPropertyDetails,
      openPropertyPayment,
    });
  const {
    renderProperties,
    attachPropertyGridEvents,
    attachPropertyActionEvents,
  } = window.PropertyDeskPropertyPortfolioWorkflow.create({
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
  const { selectImportRows, parseCSV, createImportLookup } =
    window.PropertyDeskImportUtils;
  const { validateAccountRows, validatePaymentRows, validateExpenseRows } =
    window.PropertyDeskImportWorkflows;
  const {
    attachPreviewEvents: attachImportPreviewEvents,
    attachAccountEvents: attachAccountImportEvents,
    attachPaymentEvents: attachPaymentImportEvents,
    attachExpenseEvents: attachExpenseImportEvents,
  } = window.PropertyDeskImportFeature.create({
    $,
    state,
    selectImportRows,
    esc,
    openModal,
    closeModal,
    parseCSV,
    createImportLookup,
    validateAccountRows,
    validatePaymentRows,
    validateExpenseRows,
    todayIso,
    fetchAll,
    toast,
  });
  const { attachEvents: attachExportEvents } =
    window.PropertyDeskBackupExport.create({
      $,
      state,
      createBackup,
      todayIso,
      toast,
    });
  appLifecycle = window.PropertyDeskAppStartupWorkflow.create({
    $,
    state,
    backend,
    todayIso,
    registerShell: window.PropertyDeskPwa.registerShell,
    authContext: { $, state, fetchAll, toast },
    renderers: [
      updateGreeting,
      renderOverview,
      renderProperties,
      renderPayments,
      renderReports,
    ],
    eventBindersBeforeAuth: [
      attachModalEvents,
      attachThemeEvents,
      attachNavigationEvents,
      attachProfileEvents,
      attachWorkspaceMemberEvents,
      attachOverviewEvents,
      attachPropertyGridEvents,
      attachPropertyActionEvents,
      attachTransactionViewEvents,
      attachTransactionActionEvents,
      attachAccountDetailActionEvents,
      attachDepositEvents,
      attachCreateActionEvents,
      attachPropertyFormEvents,
      attachAccountFormEvents,
      attachLedgerEntryFormEvents,
      attachPropertyDetailEvents,
      attachPropertyHolderEvents,
      attachPropertyQuickActionEvents,
      attachPropertyDocumentEvents,
    ],
    eventBindersAfterAuth: [
      attachImportPreviewEvents,
      attachAccountImportEvents,
      attachPaymentImportEvents,
      attachExpenseImportEvents,
      attachExportEvents,
      attachReportExportEvents,
    ],
  });
  document.addEventListener("DOMContentLoaded", appLifecycle.initialize);
})();
