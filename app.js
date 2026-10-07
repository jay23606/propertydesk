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
  const { buildReportModel } = window.PropertyDeskReportModel.create({
    state,
    dateOnly,
    sumIncome,
    sumOperatingExpenses,
    accountBalance,
  });
  const { renderReports } = window.PropertyDeskReportViews.create({
    $,
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
    {
      state,
    },
  );
  const { renderReminderActivity } =
    window.PropertyDeskReminderActivityView.create({
      $,
      esc,
      fmtDate,
      money,
      model: reminderActivityModel,
    });
  const reminderPreviewModel = window.PropertyDeskReminderPreviewModel.create({
    amountDueSince,
    unpaidDueAccrualStart,
    monthEnd,
    dateOnly,
    monthStart,
    propertyAddress,
    money,
  });
  const { previewReminderEmail } = window.PropertyDeskReminderPreview.create({
    $,
    state,
    todayIso,
    moneyInput,
    toast,
    esc,
    model: reminderPreviewModel,
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
    renderReminderActivity,
  });
  const navigation = window.PropertyDeskNavigation.create({
    $,
    state,
    renderWorkspaceSettings: workspace.renderWorkspaceSettings,
  });
  const { updateGreeting, attachProfileEvents, attachWorkspaceMemberEvents } =
    workspace;
  const { navigate, attachEvents: attachNavigationEvents } = navigation;
  const { saveCorrection } = window.PropertyDeskTransactionCorrections.create({
    $,
    state,
    toast,
    fetchAll,
    closeModal,
  });
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
  const { saveVoidTransaction } =
    window.PropertyDeskTransactionMaintenance.create({
      state,
      toast,
      fetchAll,
    });
  const { voidTransaction } = window.PropertyDeskTransactionVoidEntry.create({
    toast,
    saveVoidTransaction,
  });
  const { correctTransaction } =
    window.PropertyDeskTransactionCorrectionForm.create({
      $,
      state,
      toast,
      prettyType,
      openPayment,
      openExpense,
      updatePaymentGuidance,
      EventClass: Event,
      OptionClass: Option,
    });
  const { attachEvents: attachTransactionActionEvents } =
    window.PropertyDeskTransactionViewEvents.create({
      documentRef: document,
      correctTransaction,
      voidTransaction,
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
  const { saveDepositAdjustment } =
    window.PropertyDeskDepositMaintenance.create({
      state,
      todayIso,
      toast,
      fetchAll,
    });
  const { recordDepositAdjustment } =
    window.PropertyDeskDepositAdjustmentEntry.create({
      state,
      moneyInput,
      toast,
      saveDepositAdjustment,
    });
  const { attachEvents: attachDepositEvents } =
    window.PropertyDeskDepositDetailEvents.create({
      $,
      state,
      depositSectionHTML,
      recordDepositAdjustment,
    });
  const { saveCloseAccount } =
    window.PropertyDeskAccountCloseMaintenance.create({
      state,
      toast,
      fetchAll,
      closeAccountDetails: () => closeModal($("detail-modal")),
    });
  const { closeAccount } = window.PropertyDeskAccountCloseEntry.create({
    saveCloseAccount,
  });
  const { attachEvents: attachAccountDetailActionEvents } =
    window.PropertyDeskAccountDetailEvents.create({
      $,
      state,
      closeModal,
      editAccount,
      openPayment,
      closeAccount,
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
  const { toggleArchiveProperty } = window.PropertyDeskPropertyArchive.create({
    state,
    toast,
    fetchAll,
    todayIso,
    openPropertyDetails,
  });
  const { attachEvents: attachPropertyDetailEvents } =
    window.PropertyDeskPropertyDetailEvents.create({
      $,
      state,
      closeModal,
      editAccount,
      openAccountDetails,
    });
  const { attachEvents: attachPropertyQuickActionEvents } =
    window.PropertyDeskPropertyDetailQuickActions.create({
      $,
      state,
      closeModal,
      openPayment,
      openExpense,
      openAccountForProperty,
      toggleArchiveProperty,
    });
  const { savePropertyHolders } =
    window.PropertyDeskPropertyHolderManagement.create({
      state,
      toast,
      fetchAll,
      openPropertyDetails,
    });
  const { attachEvents: attachPropertyHolderEvents } =
    window.PropertyDeskPropertyHolderEvents.create({ $, savePropertyHolders });
  const propertyDocuments = window.PropertyDeskDocuments.create({
    state,
    toast,
    fetchAll,
    openPropertyDetails,
    repository: window.PropertyDeskDocumentRepository.create(
      () => state.client,
    ),
  });
  const { attachEvents: attachPropertyDocumentEvents } =
    window.PropertyDeskPropertyDetailDocumentEvents.create({
      $,
      uploadPropertyDocument: propertyDocuments.uploadPropertyDocument,
      deletePropertyDocument: propertyDocuments.deletePropertyDocument,
      openPropertyDocument: propertyDocuments.openPropertyDocument,
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
  const importPreview = window.PropertyDeskImportPreview.create({
    $,
    state,
    selectImportRows,
    esc,
    openModal,
  });
  const stageImport = importPreview.stageImport;
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
  const {
    attachAccountEvents: attachAccountImportEvents,
    attachPaymentEvents: attachPaymentImportEvents,
    attachExpenseEvents: attachExpenseImportEvents,
  } = window.PropertyDeskImportFeature.create({
    $,
    state,
    stageImport,
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
      attachAuthEvents,
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
