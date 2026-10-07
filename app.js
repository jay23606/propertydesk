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
    window.PropertyDeskReportWorkflow.create({
      $,
      state,
      dateOnly,
      sumIncome,
      sumOperatingExpenses,
      accountBalance,
      todayIso,
      prettyType,
      esc,
      money,
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
  const {
    updateGreeting,
    navigate,
    attachNavigationEvents,
    attachProfileEvents,
    attachWorkspaceMemberEvents,
  } = window.PropertyDeskAppShellWorkflow.create({
    $,
    state,
    esc,
    toast,
    fetchAll,
    renderReminderActivity,
  });
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
  const { depositSectionHTML } = window.PropertyDeskDepositDetails.create({
    state,
    depositLedger,
    money,
    fmtDate,
    esc,
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
  const { attachPropertyDetailEvents, attachPropertyQuickActionEvents } =
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
  const { attachEvents: attachPropertyHolderEvents } =
    window.PropertyDeskPropertyHolderWorkflow.create({
      $,
      state,
      toast,
      fetchAll,
      openPropertyDetails,
    });
  const { attachPropertyDocumentEvents } =
    window.PropertyDeskPropertyDocumentWorkflow.create({
      $,
      state,
      toast,
      fetchAll,
      openPropertyDetails,
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
  const { stageImport, attachEvents: attachImportPreviewEvents } =
    window.PropertyDeskImportPreviewWorkflow.create({
      $,
      state,
      selectImportRows,
      esc,
      openModal,
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
