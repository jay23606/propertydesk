/* PropertyDesk: static client backed by Supabase Auth, Postgres and RLS. */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const {
    amortizationSchedule,
    amountDueSince,
    createBackup,
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
  const { lateReminderMailto } = window.PropertyDeskEmailUtils;
  const workspaceData = window.PropertyDeskWorkspaceData.create();
  const config = window.PROPERTYDESK_CONFIG || {};
  const configured = Boolean(
    config.supabaseUrl && config.supabaseAnonKey && window.supabase,
  );
  const state = {
    client: null,
    user: null,
    workspaceOwnerId: null,
    workspaceMembers: [],
    propertyHolders: [],
    depositEntries: [],
    reminderLogs: [],
    view: 'properties',
    properties: [],
    accounts: [],
    payments: [],
    expenses: [],
    documents: [],
    agreementVersions: [],
    importBatches: [],
    pendingImport: null,
    pendingCorrection: null,
    editingProperty: null,
    editingAccount: null,
    selectedPropertyId: null,
    auditRequestId: 0,
    passwordRecoveryInProgress: false,
    toastTimer: null,
  };
  const money = (value) => {
    const amount = Number(value || 0);
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(amount);
  };
  const dateOnly = (value) => (value ? new Date(`${value}T12:00:00`) : null);
  const fmtDate = (
    value,
    options = { month: 'short', day: 'numeric', year: 'numeric' },
  ) => {
    const date = dateOnly(value);
    return date ? date.toLocaleDateString(undefined, options) : '—';
  };
  const todayIso = () => {
    const date = new Date();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  };
  const esc = (value) => {
    const htmlEntities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return String(value ?? '').replace(
      /[&<>"']/g,
      (character) => htmlEntities[character],
    );
  };
  const prettyType = (type) =>
    ({
      rental: 'Rental',
      land_contract: 'Land contract',
      note: 'Private note',
    })[type] ||
    type ||
    'Account';
  const prettyKind = (kind) =>
    ({
      residential: 'Residential',
      land: 'Land',
      commercial: 'Commercial',
      other: 'Other',
    })[kind] ||
    kind ||
    'Property';
  const monthStart = () => {
    const date = new Date();
    date.setDate(1);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${date.getFullYear()}-${month}-01`;
  };
  const monthEnd = () => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1, 0);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  };
  const location = (property) =>
    [property.city, property.state, property.postal_code]
      .filter(Boolean)
      .join(', ');
  const propertyAddress = (property) =>
    [property.address, location(property)].filter(Boolean).join(', ');
  const streetAddress = (property) =>
    String(property.address || property.name || '')
      .split(',')[0]
      .trim();

  function toast(message) {
    const element = $('toast');
    element.textContent = message;
    element.classList.add('show');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => element.classList.remove('show'), 2800);
  }
  function moneyInput(value) {
    const raw = String(value ?? '').trim();
    const negative = /^\(.*\)$/.test(raw);
    const normalized = raw.replace(/[,$\s()]/g, '');
    const amount = Number(normalized) * (negative ? -1 : 1);
    if (!Number.isFinite(amount)) {
      return 0;
    }
    return Math.round((amount + Number.EPSILON) * 100) / 100;
  }
  function accountBalance(account, asOf = todayIso()) {
    return scheduledLoanBalance(account, asOf);
  }
  function paymentFrequencyLabel(frequency) {
    const labels = {
      monthly: 'Monthly',
      weekly: 'Weekly',
      biweekly: 'Every 2 weeks',
      quarterly: 'Quarterly',
      annual: 'Annually',
    };
    return labels[frequency] || 'Monthly';
  }
  function scheduledMonthlyRunRate() {
    return monthlyScheduledEstimate(state.accounts);
  }
  function collectedSince(date) {
    const payments = state.payments.filter(
      (payment) => String(payment.received_date) >= date,
    );
    return sumPosted(payments);
  }
  function depositLedger(accountId) {
    const entries = state.depositEntries.filter(
      (row) => row.account_id === accountId,
    );
    const result = securityDepositBalance(
      entries,
      state.payments,
      state.expenses,
    );
    return { ...result, entries };
  }
  function expenseCategoryLabel(category) {
    if (category === 'deposit_refund') {
      return 'Security deposit refund';
    }
    return String(category || 'other').replaceAll('_', ' ');
  }
  // Feature modules receive shared state and helpers; app.js connects the workflows.
  const {
    updateGreeting,
    renderOverview,
    renderProperties,
    attachEvents: attachPropertyViewEvents,
  } =
    window.PropertyDeskPropertyViews.create({
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
      streetAddress,
      dateOnly,
      monthEnd,
      lateReminderMailto,
      paymentFrequencyLabel,
      paymentStatusInMonth,
    });
  const {
    renderPayments,
    renderReports,
    attachEvents: attachTransactionViewEvents,
  } =
    window.PropertyDeskTransactionViews.create({
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
      accountBalance,
    });
  const {
    attachEvents: attachModalEvents,
    openModal,
    closeModal,
    fillSelect,
    populateFormOptions,
  } =
    window.PropertyDeskModalController.create({
      $,
      state,
      esc,
      propertyAddress,
      prettyType,
      documentRef: document,
    });
  const recordForms = window.PropertyDeskRecordForms.create({
    $,
    state,
    moneyInput,
    todayIso,
    toast,
    closeModal,
    fetchAll,
    fillSelect,
    populateFormOptions,
    prettyType,
    openModal,
  });
  const {
    resetPropertyForm,
    resetAccountForm,
    updateAllocationPreview,
    editAccount,
    openPayment,
    openPropertyPayment,
    openExpense,
    attachEvents: attachRecordFormEvents,
    attachCreateActions: attachRecordCreateActions,
  } = recordForms;
  const { deleteAccount: closeAccount } =
    window.PropertyDeskAccountMaintenance.create({
    $,
    state,
    toast,
    fetchAll,
    closeModal,
  });
  const { recordDepositAdjustment } =
    window.PropertyDeskDepositMaintenance.create({
      state,
      moneyInput,
      todayIso,
      toast,
      fetchAll,
      openAccountDetails: (...args) => openAccountDetails(...args),
    });
  const { correctTransaction, voidTransaction } =
    window.PropertyDeskTransactionMaintenance.create({
      $,
      state,
      toast,
      fetchAll,
      prettyType,
      openPayment,
      openExpense,
      updateAllocationPreview,
    });
  const {
    openPropertyDetails,
    openAccountDetails,
    attachPropertyEvents,
  } =
    window.PropertyDeskDetailViews.create({
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
      amortizationSchedule,
      amountDueSince,
      unpaidDueAccrualStart,
      todayIso,
      depositLedger,
      openModal,
      closeModal,
      editAccount,
      openPayment,
      openExpense,
      resetAccountForm,
      populateFormOptions,
      deleteAccount: closeAccount,
      propertyAddress,
    });
  const { attachEvents: attachImportEvents } =
    window.PropertyDeskImportFeature.create({
      $,
      state,
      parseCSV: window.PropertyDeskImportUtils.parseCSV,
      selectImportRows: window.PropertyDeskImportUtils.selectImportRows,
      ...window.PropertyDeskImportWorkflows,
      esc,
      todayIso,
      openModal,
      closeModal,
      fetchAll,
      toast,
    });
  const {
    uploadPropertyDocument,
    deletePropertyDocument,
    openPropertyDocument,
  } = window.PropertyDeskDocuments.create({
    state,
    toast,
    fetchAll,
    openPropertyDetails,
  });
  const { attachEvents: attachExportEvents } =
    window.PropertyDeskExports.create({
      $,
      state,
      createBackup,
      todayIso,
      toast,
      prettyType,
      accountBalance,
    });
  const {
    showConfigError,
    setAuthMode,
    handleAuthStateChange,
    restoreAuthSession,
    attachEvents: attachAuthEvents,
  } = window.PropertyDeskAuth.create({ $, state, fetchAll, toast });
  const {
    removeWorkspaceMember,
    renderWorkspaceSettings,
    attachEvents: attachWorkspaceEvents,
  } = window.PropertyDeskWorkspace.create({
    $,
    state,
    esc,
    fmtDate,
    money,
    toast,
    fetchAll,
    updateGreeting,
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
    money,
    esc,
    openModal,
  });
  const { navigate, attachEvents: attachNavigationEvents } =
    window.PropertyDeskNavigation.create({
      $,
      state,
      renderWorkspaceSettings,
      closeModal,
    });
  const { editPropertyQuickNote, savePropertyHolders, toggleArchiveProperty } =
    window.PropertyDeskPropertyManagement.create({
      $,
      state,
      toast,
      fetchAll,
      todayIso,
      streetAddress,
      openPropertyDetails,
    });
  const { attachEvents: attachActionRouterEvents } =
    window.PropertyDeskActionRouter.create({
      $,
      recordDepositAdjustment,
      removeWorkspaceMember,
      savePropertyHolders,
      openPayment,
      resetAccountForm,
      populateFormOptions,
      openModal,
      editPropertyQuickNote,
      openPropertyDetails,
      openPropertyPayment,
      deletePropertyDocument,
      openPropertyDocument,
      correctTransaction,
      voidTransaction,
      closeModal,
      openAccountDetails,
      uploadPropertyDocument,
    });

  async function fetchAll() {
    const { data: workspaceId, error: workspaceError } =
      await state.client.rpc('pd_workspace_id');
    if (workspaceError || !workspaceId) {
      const error = workspaceError || new Error('Missing workspace');
      toast(workspaceError?.message || 'Could not load this workspace');
      throw error;
    }
    state.workspaceOwnerId = workspaceId;
    try {
      Object.assign(
        state,
        await workspaceData.loadWorkspaceRecords(state.client, workspaceId),
      );
    } catch (error) {
      toast(error?.message || 'Could not load this workspace');
      throw error;
    }
    render();
  }
  function render() {
    updateGreeting();
    renderOverview();
    renderProperties();
    renderPayments();
    renderReports();
  }
  function attachEvents() {
    attachModalEvents();
    attachNavigationEvents();
    attachPropertyViewEvents();
    attachTransactionViewEvents();
    attachRecordCreateActions(navigate);
    attachRecordFormEvents(previewReminderEmail);
    attachActionRouterEvents();
    attachPropertyEvents(toggleArchiveProperty);
    attachWorkspaceEvents();
    attachAuthEvents();
    attachImportEvents();
    attachExportEvents();
  }
  function setupServiceWorker() {
    if (
      !('serviceWorker' in navigator) ||
      !window.location.protocol.startsWith('http')
    )
      return;
    navigator.serviceWorker
      .register('./sw.js')
      .catch((error) =>
        console.warn(
          'PropertyDesk shell cache could not be registered:',
          error,
        ),
      );
  }
  async function init() {
    attachEvents();
    $('payment-date').value = todayIso();
    $('account-start').value = todayIso();
    setAuthMode(false);
    setupServiceWorker();

    if (!configured) {
      showConfigError();
      return;
    }

    state.client = window.supabase.createClient(
      config.supabaseUrl,
      config.supabaseAnonKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      },
    );
    state.client.auth.onAuthStateChange(handleAuthStateChange);
    await restoreAuthSession();
  }
  document.addEventListener('DOMContentLoaded', init);
})();
