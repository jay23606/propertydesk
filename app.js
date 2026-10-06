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
  const { buildReportModel } = window.PropertyDeskReportModel.create({
    state,
    dateOnly,
    sumIncome,
    sumOperatingExpenses,
    accountBalance,
  });
  const { renderReports } = window.PropertyDeskReportViews.create({
    $,
    dateOnly,
    esc,
    money,
    buildReportModel,
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
  const reminderActivityModel = window.PropertyDeskReminderActivityModel.create(
    { state },
  );
  const { renderReminderActivity } =
    window.PropertyDeskReminderActivityView.create({
      $,
      esc,
      fmtDate,
      money,
      model: reminderActivityModel,
    });
  const { previewReminderEmail } = window.PropertyDeskReminderPreview.create({
    $,
    state,
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
  const recordEntry = window.PropertyDeskLedgerWorkflow.create({
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
  });
  const {
    editAccount,
    updatePaymentGuidance,
    openPayment,
    openPropertyPayment,
    openExpense,
    attachPropertyFormEvents,
    attachAccountFormEvents,
    attachLedgerEntryFormEvents,
    resetPropertyForm,
    resetAccountForm,
  } = recordEntry;
  const { attachEvents: attachCreateActionEvents, openAccountForProperty } =
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
      navigate,
      documentRef: document,
    });
  function attachEntryEvents() {
    attachCreateActionEvents();
    attachPropertyFormEvents();
    attachAccountFormEvents();
    attachLedgerEntryFormEvents();
  }
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
  const { attachPropertyDetailEvents } =
    window.PropertyDeskPropertyDetailActionsWorkflow.create({
      $,
      state,
      toast,
      fetchAll,
      todayIso,
      openPropertyDetails,
      closeModal,
      editAccount,
      openPayment,
      openExpense,
      openAccountForProperty,
      openAccountDetails,
    });
  const { attachPropertyDocumentEvents } =
    window.PropertyDeskPropertyDocumentWorkflow.create({
      $,
      state,
      toast,
      fetchAll,
      openPropertyDetails,
    });
  function attachPropertyDetailsEvents() {
    attachPropertyDetailEvents();
    attachPropertyDocumentEvents();
  }
  const propertySummaryModel =
    window.PropertyDeskOverviewPropertySummaryModel.create({
      state,
      monthlyScheduledEstimate,
      accountBalance,
      amountDueSince,
      unpaidDueAccrualStart,
      todayIso,
    });
  const overviewModel = window.PropertyDeskOverviewModel.create({
    state,
    propertySummaryModel,
    collectedSince,
    scheduledMonthlyRunRate,
    monthStart,
    isPosted,
    postedOnOrAfter,
  });
  const { renderOverview } = window.PropertyDeskOverview.create({
    $,
    esc,
    prettyKind,
    money,
    propertyAddress,
    prettyType,
    fmtDate,
    overviewModel,
  });
  const { attachEvents: attachOverviewEvents } =
    window.PropertyDeskOverviewEvents.create({
      $,
      openPropertyDetails,
      openPropertyPayment,
    });
  const portfolioTable = window.PropertyDeskPropertyPortfolioTable.create({
    esc,
    money,
    paymentFrequencyLabel,
  });
  const portfolioAccountRowModel =
    window.PropertyDeskPropertyPortfolioAccountRowModel.create({
      state,
      monthlyScheduledEstimate,
      accountBalance,
      amountDueSince,
      unpaidDueAccrualStart,
      todayIso,
      propertyAddress,
      monthStart,
      dateOnly,
      monthEnd,
      lateReminderMailto,
      paymentStatusInMonth,
      money,
    });
  const portfolioModel = window.PropertyDeskPropertyPortfolioModel.create({
    state,
    accountRowModel: portfolioAccountRowModel,
    propertyAddress,
    streetAddress,
  });
  const { renderProperties, attachEvents: attachPropertyGridEvents } =
    window.PropertyDeskPropertyViews.create({
      $,
      state,
      esc,
      portfolioTable,
      portfolioModel,
    });
  const { attachEvents: attachPropertyActionEvents } =
    window.PropertyDeskPropertyPortfolioActionsWorkflow.create({
      $,
      state,
      toast,
      fetchAll,
      streetAddress,
      openPayment,
      openPropertyDetails,
      openAccountForProperty,
    });
  function attachPropertyPortfolioEvents() {
    attachPropertyGridEvents();
    attachPropertyActionEvents();
  }
  const { selectImportRows, parseCSV, createImportLookup } =
    window.PropertyDeskImportUtils;
  const { validateAccountRows, validatePaymentRows, validateExpenseRows } =
    window.PropertyDeskImportWorkflows;
  const importPreview = window.PropertyDeskImportPreview.create({
    $,
    state,
    selectImportRows,
    esc,
    openModal,
    closeModal,
    toast,
  });
  const { attachEvents: attachImportPreviewEvents } =
    window.PropertyDeskImportPreviewEvents.create({
      $,
      state,
      selectImportRows,
      renderImportPreview: importPreview.renderImportPreview,
      updateImportCommitButton: importPreview.updateImportCommitButton,
      closeModal,
      toast,
    });
  const { attachEvents: attachImportFileEvents } =
    window.PropertyDeskImportFeature.create({
      $,
      state,
      stageImport: importPreview.stageImport,
      parseCSV,
      createImportLookup,
      validateAccountRows,
      validatePaymentRows,
      validateExpenseRows,
      todayIso,
      fetchAll,
      toast,
    });
  function attachCsvImportEvents() {
    attachImportPreviewEvents();
    attachImportFileEvents();
  }
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
