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
  const config = window.PROPERTYDESK_CONFIG || {};
  const configured = Boolean(config.supabaseUrl && config.supabaseAnonKey && window.supabase);
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
  const money = (value) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(Number(value || 0));
  const dateOnly = (value) => value ? new Date(`${value}T12:00:00`) : null;
  const fmtDate = (value, opts = { month: 'short', day: 'numeric', year: 'numeric' }) => { const d = dateOnly(value); return d ? d.toLocaleDateString(undefined, opts) : '—'; };
  const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  function setTheme(theme, persist = false) {
    const next = theme === 'light' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    const themeColor = next === 'dark' ? '#151b17' : '#f6f7f4';
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      'content',
      themeColor,
    );
    if (persist) {
      try {
        localStorage.setItem('propertydesk-theme', next);
      } catch {
        // Keep the active theme for this page when storage is unavailable.
      }
    }

    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      const action = next === 'dark' ? 'light' : 'dark';
      button.setAttribute('aria-label', `Switch to ${action} mode`);
      button.setAttribute('aria-pressed', String(next === 'dark'));
      const label = button.querySelector('.theme-label');
      if (label) {
        label.textContent = `${action[0].toUpperCase()}${action.slice(1)} mode`;
      }
      const icon = button.querySelector('.theme-icon');
      if (icon) icon.textContent = next === 'dark' ? '☼' : '☾';
    });
  }
  function syncThemeButtons() {
    setTheme(document.documentElement.dataset.theme);
  }
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const prettyType = (t) => ({ rental: 'Rental', land_contract: 'Land contract', note: 'Private note' }[t] || t || 'Account');
  const prettyKind = (t) => ({ residential: 'Residential', land: 'Land', commercial: 'Commercial', other: 'Other' }[t] || t || 'Property');
  const monthStart = () => { const d = new Date(); d.setDate(1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; };
  const monthEnd = () => { const d = new Date(); d.setMonth(d.getMonth() + 1, 0); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const location = p => [p.city, p.state, p.postal_code].filter(Boolean).join(', ');
  const propertyAddress = p => [p.address, location(p)].filter(Boolean).join(', ');
  const streetAddress = p => String(p.address || p.name || '').split(',')[0].trim();

  function toast(message) {
    const el = $('toast'); el.textContent = message; el.classList.add('show');
    clearTimeout(state.toastTimer); state.toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
  }
  function moneyInput(value) {
    const raw = String(value ?? '').trim();
    const negative = /^\(.*\)$/.test(raw);
    const normalized = raw.replace(/[,$\s()]/g, '');
    const amount = Number(normalized) * (negative ? -1 : 1);
    if (!Number.isFinite(amount)) return 0;
    return Math.round((amount + Number.EPSILON) * 100) / 100;
  }
  function accountBalance(account, asOf = todayIso()) {
    return scheduledLoanBalance(account, asOf);
  }
  function paymentFrequencyLabel(frequency) {
    return ({
      monthly: 'Monthly',
      weekly: 'Weekly',
      biweekly: 'Every 2 weeks',
      quarterly: 'Quarterly',
      annual: 'Annually',
    }[frequency] || 'Monthly');
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
    if (category === 'deposit_refund') return 'Security deposit refund';
    return String(category || 'other').replaceAll('_', ' ');
  }
  function expenseCategoryLabel(category) { return category==='deposit_refund'?'Security deposit refund':String(category||'other').replaceAll('_',' '); }

  // Feature modules receive shared state and helpers; app.js connects the workflows.
  const { updateGreeting, renderOverview, renderProperties } =
    window.PropertyDeskPropertyViews.create({
      $, state, monthlyScheduledEstimate, accountBalance, amountDueSince,
      unpaidDueAccrualStart, todayIso, esc, prettyKind, money, propertyAddress,
      collectedSince, scheduledMonthlyRunRate, monthStart, isPosted, prettyType,
      fmtDate, streetAddress, dateOnly, monthEnd, lateReminderMailto,
      paymentFrequencyLabel, paymentStatusInMonth,
    });
  const { renderPayments, renderReports } =
    window.PropertyDeskTransactionViews.create({
      $, state, dateOnly, fmtDate, esc, expenseCategoryLabel, money, isPosted,
      monthStart, sumIncome, sumOperatingExpenses, accountBalance,
    });
  const recordForms = window.PropertyDeskRecordForms.create({
    $, state, moneyInput, todayIso, toast, closeModal, fetchAll, fillSelect,
    populateFormOptions, prettyType, openModal,
  });
  const {
    resetPropertyForm, resetAccountForm, updateLoanFields, saveProperty,
    saveAccount, updateAllocationPreview, prefillPaymentAmount, savePayment, saveExpense,
    editAccount, openPayment, openPropertyPayment, openExpense,
    correctTransaction,
  } = recordForms;
  const { recordDepositAdjustment, deleteAccount, voidTransaction } =
    window.PropertyDeskLedgerActions.create({
      $, state, moneyInput, todayIso, toast, fetchAll, closeModal,
      openAccountDetails: (...args) => openAccountDetails(...args),
    });
  const { openPropertyDetails, openAccountDetails } =
    window.PropertyDeskDetailViews.create({
      $, state, isPosted, sumIncome, sumOperatingExpenses, money, fmtDate, esc,
      prettyType, paymentFrequencyLabel, accountBalance, amortizationSchedule,
      amountDueSince, unpaidDueAccrualStart, todayIso, depositLedger, openModal,
      closeModal, editAccount, openPayment, deleteAccount, propertyAddress,
    });
  const { attachEvents: attachImportEvents } =
    window.PropertyDeskImportFeature.create({
      $, state,
      parseCSV: window.PropertyDeskImportUtils.parseCSV,
      selectImportRows: window.PropertyDeskImportUtils.selectImportRows,
      ...window.PropertyDeskImportWorkflows,
      esc, todayIso, openModal, closeModal, fetchAll, toast,
    });
  const { uploadPropertyDocument, deletePropertyDocument, openPropertyDocument } =
    window.PropertyDeskDocuments.create({
      state, toast, fetchAll, openPropertyDetails,
    });
  const { exportAll, exportReport } = window.PropertyDeskExports.create({
    $, state, createBackup, todayIso, toast, prettyType, accountBalance,
  });
  const {
    showAuth, showApp, showConfigError, setAuthMode, showPasswordReset,
    requestPasswordReset, submitPasswordReset, submitAuth, startWorkspace,
  } = window.PropertyDeskAuth.create({ $, state, fetchAll, toast });
  const {
    saveProfile, addWorkspaceMember, removeWorkspaceMember, renderWorkspaceSettings,
  } = window.PropertyDeskWorkspace.create({
    $, state, esc, fmtDate, money, toast, fetchAll, updateGreeting,
  });
  const { previewReminderEmail } = window.PropertyDeskReminderPreview.create({
    $, state, amountDueSince, unpaidDueAccrualStart, todayIso, monthEnd,
    moneyInput, toast, dateOnly, monthStart, propertyAddress, money, esc, openModal,
  });
  const { editPropertyQuickNote, savePropertyHolders, toggleArchiveProperty } =
    window.PropertyDeskPropertyManagement.create({
      $, state, toast, fetchAll, todayIso, streetAddress, openPropertyDetails,
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

    const [properties, accounts, payments, expenses, importBatches, documents,
      agreementVersions, propertyHolders, workspaceMembers, depositEntries, reminderLogs] =
      await Promise.all([
        state.client.from('pd_properties').select('*')
          .eq('user_id', workspaceId).order('created_at', { ascending: false }),
        state.client.from('pd_accounts').select('*')
          .eq('user_id', workspaceId).order('created_at', { ascending: false }),
        state.client.from('pd_payments').select('*')
          .eq('user_id', workspaceId)
          .order('received_date', { ascending: false })
          .order('recorded_at', { ascending: false }),
        state.client.from('pd_expenses').select('*')
          .eq('user_id', workspaceId)
          .order('expense_date', { ascending: false })
          .order('recorded_at', { ascending: false }),
        state.client.from('pd_import_batches').select('*')
          .eq('user_id', workspaceId).order('created_at', { ascending: false }),
        state.client.from('pd_documents').select('*')
          .eq('user_id', workspaceId).order('created_at', { ascending: false }),
        state.client.from('pd_agreement_versions').select('*')
          .eq('user_id', workspaceId).order('replaced_on', { ascending: false }),
        state.client.from('pd_property_holders').select('*').eq('user_id', workspaceId),
        state.client.rpc('pd_list_workspace_members'),
        state.client.from('pd_deposit_entries').select('*')
          .eq('user_id', workspaceId)
          .order('movement_date', { ascending: false })
          .order('created_at', { ascending: false }),
        state.client.from('pd_reminder_logs').select('*')
          .eq('user_id', workspaceId)
          .order('attempted_at', { ascending: false })
          .limit(300),
      ]);
    const results = [properties, accounts, payments, expenses, importBatches,
      documents, agreementVersions, propertyHolders, workspaceMembers,
      depositEntries, reminderLogs];
    const failedResult = results.find((result) => result.error);
    if (failedResult) {
      toast(failedResult.error.message);
      throw failedResult.error;
    }

    state.properties = properties.data || [];
    state.accounts = accounts.data || [];
    state.payments = payments.data || [];
    state.expenses = expenses.data || [];
    state.importBatches = importBatches.data || [];
    state.documents = documents.data || [];
    state.agreementVersions = agreementVersions.data || [];
    state.propertyHolders = propertyHolders.data || [];
    state.workspaceMembers = workspaceMembers.data || [];
    state.depositEntries = depositEntries.data || [];
    state.reminderLogs = reminderLogs.data || [];
    render();
  }
  function render() {
    updateGreeting();
    renderOverview();
    renderProperties();
    renderPayments();
    renderReports();
  }
  function navigate(view) {
    state.view = view;
    document.querySelectorAll('.page').forEach((page) => {
      page.classList.toggle('active', page.id === 'page-' + view);
    });
    document.querySelectorAll('.nav-link').forEach((link) => {
      link.classList.toggle('active', link.dataset.view === view);
    });
    $('page-crumb').textContent = view.charAt(0).toUpperCase() + view.slice(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function openModal(id) {
    $(id).classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
  function resetPaymentModal() {
    $('payment-modal-title').textContent = 'Record payment';
    $('payment-modal').querySelector('.eyebrow').textContent = 'PAYMENT ENTRY';
    $('payment-save-button').textContent = 'Save payment';
    $('payment-save-next').classList.remove('hidden');
  }
  function resetExpenseModal() {
    $('expense-modal-title').textContent = 'Record expense';
    $('expense-modal').querySelector('.eyebrow').textContent = 'PROPERTY EXPENSE';
    $('expense-save-button').textContent = 'Save expense';
    $('expense-save-next').classList.remove('hidden');
  }
  function closeModal(modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = '';

    if (modal.id === 'import-preview-modal') state.pendingImport = null;
    if (modal.id === 'detail-modal') state.auditRequestId++;
    if (modal.id !== 'payment-modal' && modal.id !== 'expense-modal') return;

    state.pendingCorrection = null;
    if (modal.id === 'payment-modal') resetPaymentModal();
    else resetExpenseModal();
  }
  function fillSelect(id, options, placeholder) {
    const element = $(id);
    const optionHTML = options
      .map((option) =>
        `<option value="${esc(option.value)}">${esc(option.label)}</option>`,
      )
      .join('');
    element.innerHTML = `<option value="">${esc(placeholder)}</option>${optionHTML}`;
  }
  function populateFormOptions() {
    const propertyOptions = state.properties.map((property) => ({
      value: property.id,
      label: `${property.name} — ${propertyAddress(property)}`,
    }));
    const paymentOptions = state.accounts
      .filter((account) => account.status === 'active')
      .map((account) => ({
        value: account.id,
        label: `${account.party_name || account.name} — ${prettyType(account.account_type)}`,
      }));
    const expenseAccountOptions = state.accounts.map((account) => ({
      value: account.id,
      label: `${account.name} — ${prettyType(account.account_type)}`,
    }));

    fillSelect('account-property', propertyOptions, 'Choose a property');
    fillSelect('payment-account', paymentOptions, 'Choose an account');
    fillSelect('expense-property', propertyOptions, 'Choose a property');
    fillSelect('expense-account', expenseAccountOptions, 'Property level');
  }
  function attachThemeAndNavigationEvents() {
    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      button.addEventListener('click', () =>
        setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark', true),
      );
    });
    syncThemeButtons();

    document.querySelectorAll('.nav-link').forEach((link) => {
      link.addEventListener('click', () => {
        if (link.dataset.view === 'workspace') renderWorkspaceSettings();
        navigate(link.dataset.view);
      });
    });
    document.querySelectorAll('[data-goto]').forEach((link) => {
      link.addEventListener('click', () => navigate(link.dataset.goto));
    });
    document.querySelectorAll('[data-close]').forEach((button) => {
      button.addEventListener('click', () => closeModal(button.closest('.modal')));
    });
  }

  function attachCreateActions() {
    document.querySelectorAll('[data-open="property-modal"]').forEach((button) => {
      button.addEventListener('click', () => {
        resetPropertyForm();
        openModal('property-modal');
      });
    });
    document.querySelectorAll('[data-open="account-modal"]').forEach((button) => {
      button.addEventListener('click', () => {
        if (!state.properties.length) {
          toast('Add a property before creating an account');
          navigate('properties');
          return;
        }
        resetAccountForm();
        populateFormOptions();
        openModal('account-modal');
      });
    });

    const openPayments = () => {
      if (!state.accounts.length) {
        toast('Add an account before recording a payment');
        navigate('properties');
        return;
      }
      openPayment();
    };
    document.querySelectorAll('[data-open="payment-modal"]').forEach((button) => {
      button.addEventListener('click', openPayments);
    });
    $('quick-payment').addEventListener('click', openPayments);
    document.querySelectorAll('[data-open="expense-modal"]').forEach((button) => {
      button.addEventListener('click', () => {
        if (!state.properties.length) {
          toast('Add a property before recording an expense');
          navigate('properties');
          return;
        }
        openExpense();
      });
    });
  }

  function attachFormEvents() {
    $('property-form').addEventListener('submit', saveProperty);
    $('account-form').addEventListener('submit', saveAccount);
    $('account-reminder-preview').addEventListener('click', previewReminderEmail);
    $('payment-form').addEventListener('submit', savePayment);
    $('expense-form').addEventListener('submit', saveExpense);
    $('account-type').addEventListener('change', updateLoanFields);
    $('payment-account').addEventListener('change', () => {
      prefillPaymentAmount();
      updateAllocationPreview();
    });
    $('payment-amount').addEventListener('input', updateAllocationPreview);
    $('payment-date').addEventListener('change', updateAllocationPreview);
    $('expense-property').addEventListener('change', () => {
      const propertyId = $('expense-property').value;
      const relatedAccounts = state.accounts.filter((account) => account.property_id === propertyId);
      fillSelect(
        'expense-account',
        relatedAccounts.map((account) => ({
          value: account.id,
          label: `${account.name} — ${prettyType(account.account_type)}`,
        })),
        'Property level',
      );
    });
    $('expense-category').addEventListener('change', () => {
      $('deposit-refund-hint').classList.toggle(
        'hidden',
        $('expense-category').value !== 'deposit_refund',
      );
    });
  }

  function attachSearchEvents() {
    $('property-search').addEventListener('input', renderProperties);
    $('property-filter').addEventListener('change', renderProperties);
    $('property-holder-filter').addEventListener('change', renderProperties);
    $('show-archived').addEventListener('change', renderProperties);
    $('payment-search').addEventListener('input', renderPayments);
    $('payment-period').addEventListener('change', renderPayments);
    $('transaction-type').addEventListener('change', renderPayments);
  }

  function attachDelegatedActionEvents() {
    document.addEventListener('click', (event) => {
      const depositAdjustment = event.target.closest('[data-deposit-adjustment]');
      if (depositAdjustment) {
        recordDepositAdjustment(depositAdjustment.dataset.accountId, depositAdjustment.dataset.depositAdjustment);
        return;
      }
      const removeMember = event.target.closest('[data-remove-member]');
      if (removeMember) {
        removeWorkspaceMember(removeMember.dataset.removeMember);
        return;
      }
      if (event.target.closest('[data-save-holders]')) {
        savePropertyHolders();
        return;
      }
      const accountPayment = event.target.closest('[data-account-payment]');
      if (accountPayment) {
        event.preventDefault();
        event.stopPropagation();
        openPayment(accountPayment.dataset.accountPayment);
        return;
      }
      const propertyAccount = event.target.closest('[data-property-account]');
      if (propertyAccount) {
        resetAccountForm();
        populateFormOptions();
        $('account-property').value = propertyAccount.dataset.propertyAccount;
        openModal('account-modal');
        return;
      }
      const propertyNote = event.target.closest('[data-property-note]');
      if (propertyNote) {
        event.preventDefault();
        event.stopPropagation();
        editPropertyQuickNote(propertyNote.dataset.propertyNote);
        return;
      }
      const propertyOpen = event.target.closest('[data-property-open]');
      if (propertyOpen) {
        openPropertyDetails(propertyOpen.dataset.propertyOpen);
        return;
      }
      const quickPayment = event.target.closest('[data-property-payment]');
      if (quickPayment) {
        event.preventDefault();
        event.stopPropagation();
        openPropertyPayment(quickPayment.dataset.propertyPayment);
        return;
      }
      const deleteDocument = event.target.closest('[data-delete-document]');
      if (deleteDocument) {
        deletePropertyDocument(deleteDocument.dataset.deleteDocument);
        return;
      }
      const openDocument = event.target.closest('[data-open-document]');
      if (openDocument) {
        event.preventDefault();
        event.stopPropagation();
        openPropertyDocument(openDocument.dataset.openDocument);
        return;
      }
      const correction = event.target.closest('[data-correct-transaction]');
      if (correction) {
        correctTransaction(correction.dataset.kind, correction.dataset.id);
        return;
      }
      const voidButton = event.target.closest('[data-void-transaction]');
      if (voidButton) {
        voidTransaction(voidButton.dataset.kind, voidButton.dataset.id);
        return;
      }
      const accountDetail = event.target.closest('[data-detail]');
      if (accountDetail) {
        closeModal($('property-detail-modal'));
        openAccountDetails(accountDetail.dataset.detail);
        return;
      }
      const propertyCard = event.target.closest('[data-property-card]');
      if (propertyCard) openPropertyDetails(propertyCard.dataset.propertyCard);
    });

    document.addEventListener('change', (event) => {
      if (event.target.matches('[data-property-document]')) uploadPropertyDocument(event.target);
    });
  }

  function attachPropertyDetailEvents() {
    $('property-detail-content').addEventListener('click', (event) => {
      const button = event.target.closest('[data-edit-account]');
      if (!button) return;
      const account = state.accounts.find((item) => item.id === button.dataset.editAccount);
      if (!account) return;
      event.preventDefault();
      closeModal($('property-detail-modal'));
      editAccount(account);
    });

    $('property-detail-add-income').addEventListener('click', () => {
      const propertyId = state.selectedPropertyId;
      if (!propertyId) return;
      closeModal($('property-detail-modal'));
      openPayment(null, propertyId);
    });
    $('property-detail-add-expense').addEventListener('click', () => {
      const propertyId = state.selectedPropertyId;
      if (!propertyId) return;
      closeModal($('property-detail-modal'));
      openExpense(propertyId);
    });
    $('property-detail-add-account').addEventListener('click', () => {
      const propertyId = state.selectedPropertyId;
      if (!propertyId) return;
      closeModal($('property-detail-modal'));
      resetAccountForm();
      populateFormOptions();
      $('account-property').value = propertyId;
      openModal('account-modal');
    });
    $('property-archive-toggle').addEventListener('click', toggleArchiveProperty);
  }

  function attachWorkspaceAndAuthEvents() {
    $('display-name-form').addEventListener('submit', saveProfile);
    $('member-add-form').addEventListener('submit', addWorkspaceMember);
    $('user-menu').addEventListener('click', () => {
      renderWorkspaceSettings();
      navigate('workspace');
    });
    $('sign-out').addEventListener('click', async () => {
      await state.client.auth.signOut();
      state.user = null;
      state.properties = [];
      state.accounts = [];
      state.payments = [];
      showAuth();
      setAuthMode(false);
    });
    $('auth-toggle').addEventListener('click', () =>
      setAuthMode($('auth-form').dataset.mode !== 'signup'),
    );
    $('auth-form').addEventListener('submit', submitAuth);
    $('forgot-password').addEventListener('click', requestPasswordReset);
    $('password-reset-form').addEventListener('submit', submitPasswordReset);
    $('reset-password-cancel').addEventListener('click', () => {
      state.passwordRecoveryInProgress = false;
      setAuthMode(false);
      showAuth();
    });
  }

  function attachImportAndExportEvents() {
    attachImportEvents();
    $('export-all').addEventListener('click', exportAll);
    $('export-report').addEventListener('click', exportReport);
  }

  function attachKeyboardEvents() {
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        document.querySelectorAll('.modal:not(.hidden)').forEach(closeModal);
      }
    });
  }

  function attachEvents() {
    attachThemeAndNavigationEvents();
    attachCreateActions();
    attachFormEvents();
    attachSearchEvents();
    attachDelegatedActionEvents();
    attachPropertyDetailEvents();
    attachWorkspaceAndAuthEvents();
    attachImportAndExportEvents();
    attachKeyboardEvents();
  }
  function setupServiceWorker() {
    if (!('serviceWorker' in navigator) || !window.location.protocol.startsWith('http')) return;
    navigator.serviceWorker.register('./sw.js').catch((error) =>
      console.warn('PropertyDesk shell cache could not be registered:', error),
    );
  }
  function handleAuthStateChange(event, session) {
    if (event === 'SIGNED_OUT') {
      state.user = null;
      state.passwordRecoveryInProgress = false;
      showAuth();
      setAuthMode(false);
      return;
    }
    if (event === 'PASSWORD_RECOVERY' && session?.user) {
      state.user = session.user;
      showPasswordReset();
      return;
    }
    if (!session?.user) return;

    const previousUserId = state.user?.id;
    state.user = session.user;
    const signedIntoNewUser = event === 'SIGNED_IN' && previousUserId !== session.user.id;
    if (signedIntoNewUser && !state.passwordRecoveryInProgress) startWorkspace();
  }
  function isPasswordRecoverySession(session) {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    return params.get('type') === 'recovery' && params.get('access_token') === session?.access_token;
  }
  async function restoreAuthSession() {
    const { data: { session } } = await state.client.auth.getSession();
    if (!session?.user) {
      showAuth();
      return;
    }

    state.user = session.user;
    if (isPasswordRecoverySession(session)) showPasswordReset();
    else if (!state.passwordRecoveryInProgress) await startWorkspace();
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
      { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } },
    );
    state.client.auth.onAuthStateChange(handleAuthStateChange);
    await restoreAuthSession();
  }
  document.addEventListener('DOMContentLoaded',init);
})();
