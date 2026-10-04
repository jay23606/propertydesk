/* Pure posted-ledger calculations shared by the app and its tests. */
(() => {
  'use strict';

  function isPosted(transaction) {
    return !transaction?.status || transaction.status === 'posted';
  }

  function hasPostedPaymentInMonth(payments, accountId, month) {
    const yearMonth = String(month || '').slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(yearMonth)) return false;
    return payments.some(payment => payment.account_id === accountId
      && isPosted(payment)
      && !['deposit', 'late_fee'].includes(payment.income_category)
      && String(payment.received_date || '').slice(0, 7) === yearMonth);
  }

  function postedPaymentTotalInMonth(payments, accountId, month) {
    const yearMonth = String(month || '').slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(yearMonth)) return 0;
    const total = payments.filter(payment => payment.account_id === accountId
      && isPosted(payment)
      && !['deposit', 'late_fee'].includes(payment.income_category)
      && String(payment.received_date || '').slice(0, 7) === yearMonth)
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    return Math.round((total + Number.EPSILON) * 100) / 100;
  }

  function paymentStatusInMonth(payments, accountId, month, scheduledAmount) {
    const total = postedPaymentTotalInMonth(payments, accountId, month);
    if (total <= 0) return 'none';
    const expected = Number(scheduledAmount || 0);
    return expected > 0 && total + 0.004 >= expected ? 'full' : 'partial';
  }

  function sumPosted(transactions, amountField = 'amount') {
    return transactions.filter(isPosted).reduce((sum, transaction) => sum + Number(transaction[amountField] || 0), 0);
  }

  function sumIncome(transactions, amountField = 'amount') {
    return sumPosted(transactions.filter(transaction => transaction.income_category !== 'deposit'), amountField);
  }

  function sumOperatingExpenses(transactions, amountField = 'amount') {
    return sumPosted(transactions.filter(transaction => transaction.category !== 'deposit_refund'), amountField);
  }

  function securityDepositBalance(entries, payments, expenses) {
    const paymentById=new Map(payments.map(row=>[row.id,row])),expenseById=new Map(expenses.map(row=>[row.id,row]));
    const active=entries.filter(row=>row.entry_type==='retained'||row.entry_type==='restored'||(row.entry_type==='received'&&isPosted(paymentById.get(row.source_payment_id)))||(row.entry_type==='refunded'&&isPosted(expenseById.get(row.source_expense_id))));
    const totals={received:0,refunded:0,retained:0,restored:0};
    for(const entry of active)totals[entry.entry_type]+=Number(entry.amount||0);
    totals.held=totals.received-totals.refunded-totals.retained+totals.restored;
    return {active,totals};
  }

  function monthlyScheduledEstimate(accounts) {
    const multipliers = { monthly: 1, weekly: 52 / 12, biweekly: 26 / 12, quarterly: 1 / 3, annual: 1 / 12 };
    const estimate = accounts
      .filter(account => (account.status || 'active') === 'active')
      .reduce((sum, account) => sum + Number(account.payment_amount || 0) * (multipliers[account.payment_frequency] || 1), 0);
    return Math.round((estimate + Number.EPSILON) * 100) / 100;
  }

  function amountDueSince(accounts, payments, accrualStart, asOf) {
    const start = new Date(`${accrualStart}T12:00:00`), asOfDate = new Date(`${asOf}T12:00:00`);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(asOfDate.getTime()) || start > asOfDate) return 0;
    // The current calendar month's installment is assumed unpaid even before its due day.
    const end = new Date(asOfDate.getFullYear(), asOfDate.getMonth() + 1, 0, 12);
    const cents = value => Math.round((value + Number.EPSILON) * 100) / 100;
    const interval = { monthly: [1,0], weekly: [0,7], biweekly: [0,14], quarterly: [3,0], annual: [12,0] };
    let scheduled = 0;
    for (const account of accounts.filter(item => (item.status || 'active') === 'active')) {
      const scheduleStart = new Date(`${account.start_date || account.next_due_date}T12:00:00`);
      const nextDue = new Date(`${account.next_due_date || account.start_date}T12:00:00`);
      if (!Number.isFinite(scheduleStart.getTime()) || !Number.isFinite(nextDue.getTime()) || scheduleStart > asOfDate) continue;
      const step = interval[account.payment_frequency] || interval.monthly;
      const due = new Date(nextDue);
      const dueDay = nextDue.getDate();
      const lowerBound = scheduleStart > start ? scheduleStart : start;
      let backGuard = 0;
      while (due >= lowerBound && due > scheduleStart && backGuard++ < 1200) retreatDueDate(due, step[0], step[1], dueDay);
      let forwardGuard = 0;
      while (due < lowerBound && forwardGuard++ < 1200) advanceDueDate(due, step[0], step[1], dueDay);
      let guard = 0;
      while (due <= end && guard++ < 1200) {
        scheduled += Number(account.payment_amount || 0);
        advanceDueDate(due, step[0], step[1], dueDay);
      }
    }
    const accountIds = new Set(accounts.map(item => item.id));
    const received = payments.filter(item => accountIds.has(item.account_id) && isPosted(item) && !['deposit','late_fee'].includes(item.income_category) && String(item.received_date || '') >= accrualStart && String(item.received_date || '') <= asOf)
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    return cents(Math.max(0, scheduled - received));
  }

  function unpaidDueAccrualStart(account) {
    // Imported payment histories are incomplete before October 2026, so don't infer older arrears.
    return '2026-10-01';
  }

  function advanceDueDate(date, months, days, anchorDay = date.getDate()) {
    if (days) { date.setDate(date.getDate() + days); return; }
    const first = new Date(date.getFullYear(), date.getMonth() + months, 1, 12);
    const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0, 12).getDate();
    first.setDate(Math.min(anchorDay, lastDay)); date.setTime(first.getTime());
  }

  function retreatDueDate(date, months, days, anchorDay = date.getDate()) {
    if (days) { date.setDate(date.getDate() - days); return; }
    const first = new Date(date.getFullYear(), date.getMonth() - months, 1, 12);
    const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0, 12).getDate();
    first.setDate(Math.min(anchorDay, lastDay)); date.setTime(first.getTime());
  }

  function scheduledLoanBalance(account, asOf = new Date().toISOString().slice(0,10)) {
    if (!account || account.account_type === 'rental') return null;
    // This is a hypothetical on-time schedule estimate. Actual receipt history is intentionally ignored.
    const rows = amortizationSchedule(account.original_principal, account.interest_rate, account.term_months, account.start_date, account.principal_interest_amount);
    const dueRows = rows.filter(row => row.date <= asOf);
    const base = dueRows.length ? dueRows.at(-1).balance : Number(account.original_principal || 0);
    return Math.max(0, Math.round((base + Number(account.balance_adjustment || 0) + Number.EPSILON) * 100) / 100);
  }

  function principalBalance(originalPrincipal, payments, openingBalance = originalPrincipal, openingDate = null) {
    const eligible = openingDate
      ? payments.filter(payment => !payment.received_date || String(payment.received_date) > String(openingDate))
      : payments;
    return Math.max(0, Number(openingBalance ?? originalPrincipal ?? 0) - sumPosted(eligible, 'principal_amount'));
  }

  function amortizationSchedule(originalPrincipal, annualRate, termMonths, startDate, principalInterestAmount = null) {
    const principal = Number(originalPrincipal || 0), months = Number(termMonths || 0);
    if (!Number.isFinite(principal) || principal <= 0 || !Number.isInteger(months) || months <= 0) return [];
    const rate = Number(annualRate || 0) / 100 / 12;
    if (!Number.isFinite(rate) || rate < 0) return [];
    const specifiedPayment = Number(principalInterestAmount || 0);
    const payment = specifiedPayment > 0
      ? specifiedPayment
      : rate ? principal * rate / (1 - Math.pow(1 + rate, -months)) : principal / months;
    if (!Number.isFinite(payment) || payment <= 0) return [];
    const anchor = /^\d{4}-\d{2}-\d{2}$/.test(String(startDate || '')) ? new Date(`${startDate}T12:00:00`) : new Date();
    const dueDate = offset => {
      const day = anchor.getDate(), first = new Date(anchor.getFullYear(), anchor.getMonth() + offset, 1, 12);
      const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0, 12).getDate();
      first.setDate(Math.min(day, lastDay));
      return `${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, '0')}-${String(first.getDate()).padStart(2, '0')}`;
    };
    const cents = value => Math.round((value + Number.EPSILON) * 100) / 100;
    let balance = cents(principal), rows = [];
    for (let i = 1; i <= Math.min(months, 600) && balance > 0.005; i++) {
      const interest = cents(balance * rate);
      const principalPart = cents(Math.min(balance, Math.max(0, payment - interest)));
      balance = cents(Math.max(0, balance - principalPart));
      rows.push({ i, date: dueDate(i), payment: cents(interest + principalPart), principal: principalPart, interest, balance });
    }
    return rows;
  }

  function createBackup(records, exportedAt = new Date().toISOString(), includedFiles = []) {
    const tables = ['pd_properties', 'pd_accounts', 'pd_agreement_versions', 'pd_payments', 'pd_expenses', 'pd_deposit_entries', 'pd_documents', 'pd_import_batches', 'pd_audit_events', 'pd_workspace_members', 'pd_property_holders', 'pd_reminder_logs'];
    const data = Object.fromEntries(tables.map(table => [table, Array.isArray(records?.[table]) ? records[table] : []]));
    return {
      manifest: {
        format: 'propertydesk-backup',
        format_version: 7,
        schema_version: 7,
        exported_at: exportedAt,
        restore_supported: false,
        included_tables: tables,
        record_counts: Object.fromEntries(tables.map(table => [table, data[table].length])),
        included_files: includedFiles.map(file => ({ path: file.path, file_name: file.file_name, content_type: file.content_type, file_size: file.file_size, property_id: file.property_id, account_id: file.account_id })),
        file_count: includedFiles.length
      },
      data
    };
  }

  const helpers = Object.freeze({ amountDueSince, amortizationSchedule, createBackup, hasPostedPaymentInMonth, isPosted, monthlyScheduledEstimate, paymentStatusInMonth, postedPaymentTotalInMonth, principalBalance, scheduledLoanBalance, securityDepositBalance, sumIncome, sumOperatingExpenses, sumPosted, unpaidDueAccrualStart });
  globalThis.PropertyDeskLedgerUtils = helpers;
  if (typeof module !== 'undefined' && module.exports) module.exports = helpers;
})();
