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
  const backupUtils = window.PropertyDeskBackupUtils.create({
    workspaceTables: window.PropertyDeskWorkspaceTables,
  });
  const { createBackup } = backupUtils;
  const backupRecords = window.PropertyDeskBackupRecords.create({
    tables: backupUtils.tables,
    loadAllPages: window.PropertyDeskWorkspaceQuery.loadAllPages,
  });
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
  const { backend, state, fetchAll } =
    window.PropertyDeskWorkspaceRuntime.create({
      config: window.PROPERTYDESK_CONFIG || {},
      supabase: window.supabase,
      toast,
      render,
    });
  const {
    accountBalance,
    scheduledMonthlyRunRate,
    collectedSince,
    depositLedger,
  } = window.PropertyDeskWorkspaceFinancialContext.create({
    state,
    ledger: {
      todayIso,
      scheduledLoanBalance,
      monthlyScheduledEstimate,
      postedOnOrAfter,
      sumPosted,
    },
    deposit: {
      securityDepositBalance,
    },
  });
  const { summarizeAccount } =
    window.PropertyDeskAccountFinancialSummary.create({
      accountBalance,
      amountDueSince,
      unpaidDueAccrualStart,
      todayIso,
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
      downloadBlob: window.PropertyDeskDownloadUtils.downloadBlob,
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
  const {
    previewReminderEmail,
    updateGreeting,
    attachProfileEvents,
    attachWorkspaceMemberEvents,
    navigate,
    attachNavigationEvents,
  } = window.PropertyDeskWorkspaceShellWorkflow.create({
    reminder: {
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
    },
    navigation: {
      $,
      state,
      esc,
      toast,
      fetchAll,
      memberRepository: window.PropertyDeskWorkspaceMemberRepository.create({
        getClient: () => state.client,
      }),
      documentRef: document,
      windowRef: window,
    },
  });
  const { attachEvents: attachModalEvents, openModal, closeModal } = modal;
  const { attachEvents: attachThemeEvents } = window.PropertyDeskTheme.create();
  const {
    renderPayments,
    attachTransactionViewEvents,
    attachTransactionActionEvents,
    editAccount,
    openAccountForProperty,
    openPayment,
    openPropertyPayment,
    openExpense,
    attachCreateActionEvents,
    attachPropertyFormEvents,
    attachAccountFormEvents,
    attachLedgerEntryFormEvents,
  } = window.PropertyDeskTransactionWorkspaceWorkflow.create({
    maintenance: {
      $,
      state,
      toast,
      fetchAll,
      closeModal,
      prettyType,
      EventClass: Event,
      OptionClass: Option,
      documentRef: document,
      repository: window.PropertyDeskTransactionRepository,
      resolveVoidTarget:
        window.PropertyDeskTransactionVoidModel.resolveVoidTarget,
      buildVoidPayload:
        window.PropertyDeskTransactionVoidModel.buildVoidPayload,
      findCorrectionTarget:
        window.PropertyDeskTransactionCorrectionModel.findCorrectionTarget,
    },
    entry: {
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
      propertyRepository: window.PropertyDeskPropertyRepository,
      accountRepository: window.PropertyDeskAccountRepository,
      accountPayload: window.PropertyDeskAccountPayload.build,
      accountFormModel: window.PropertyDeskAccountFormModel,
      transactionRepository: window.PropertyDeskTransactionRepository,
      transactionPayloads: window.PropertyDeskTransactionPayloads,
    },
    screen: {
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
    },
  });
  const {
    openAccountDetails,
    attachDepositEvents,
    attachAccountDetailActionEvents,
  } = window.PropertyDeskAccountScreenWorkflow.create({
    content: {
      $,
      state,
      money,
      fmtDate,
      esc,
      sumPosted,
      prettyType,
      paymentFrequencyLabel,
      summarizeAccount,
      amortizationSchedule,
      openModal,
      propertyAddress,
      depositLedger,
      accountHistoryRepository: window.PropertyDeskAccountHistoryRepository,
    },
    maintenance: {
      $,
      state,
      todayIso,
      toast,
      fetchAll,
      closeModal,
      editAccount,
      openPayment,
      moneyInput,
      accountRepository: window.PropertyDeskAccountRepository,
      depositRepository: window.PropertyDeskDepositRepository,
      prepareAdjustment: window.PropertyDeskDepositAdjustmentModel.prepare,
      validateAdjustment: window.PropertyDeskDepositAdjustmentModel.validate,
    },
  });
  const {
    attachPropertyDetailEvents,
    attachPropertyQuickActionEvents,
    attachPropertyHolderEvents,
    attachPropertyDocumentEvents,
    renderOverview,
    attachOverviewEvents,
    renderProperties,
    attachPropertyGridEvents,
    attachPropertyActionEvents,
  } = window.PropertyDeskPropertyWorkspaceWorkflow.create({
    detail: {
      content: {
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
      },
      management: {
        $,
        state,
        toast,
        fetchAll,
        todayIso,
        propertyRepository: window.PropertyDeskPropertyRepository,
        closeModal,
        editAccount,
        openAccountDetails,
        openPayment,
        openExpense,
        openAccountForProperty,
      },
    },
    overview: {
      $,
      state,
      monthlyScheduledEstimate,
      summarizeAccount,
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
      openPropertyPayment,
    },
    portfolio: {
      $,
      state,
      esc,
      money,
      paymentFrequencyLabel,
      monthlyScheduledEstimate,
      summarizeAccount,
      amountDueSince,
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
      propertyRepository: window.PropertyDeskPropertyRepository,
      openAccountForProperty,
    },
  });
  const {
    attachPreviewEvents: attachImportPreviewEvents,
    attachAccountEvents: attachAccountImportEvents,
    attachPaymentEvents: attachPaymentImportEvents,
    attachExpenseEvents: attachExpenseImportEvents,
  } = window.PropertyDeskImportFeature.create({
    $,
    state,
    esc,
    openModal,
    closeModal,
    todayIso,
    fetchAll,
    toast,
    repository: window.PropertyDeskImportRepository.create({
      getClient: () => state.client,
    }),
  });
  const { attachEvents: attachExportEvents } =
    window.PropertyDeskBackupExport.create({
      $,
      state,
      createBackup,
      todayIso,
      toast,
      downloadBlob: window.PropertyDeskDownloadUtils.downloadBlob,
      zipUtils: window.PropertyDeskZipUtils,
      loadBackupRecords: backupRecords.load,
      collectBackupAgreementFiles:
        window.PropertyDeskBackupAgreementFiles.collect,
      documentRepository: window.PropertyDeskDocumentRepository.create(
        () => state.client,
      ),
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
