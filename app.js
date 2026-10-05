/* PropertyDesk: static client backed by Supabase Auth, Postgres and RLS. */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const { amountDueSince, amortizationSchedule, createBackup, isPosted, monthlyScheduledEstimate, paymentStatusInMonth, scheduledLoanBalance, securityDepositBalance, sumIncome, sumOperatingExpenses, sumPosted, unpaidDueAccrualStart } = window.PropertyDeskLedgerUtils;
  const { lateReminderMailto } = window.PropertyDeskEmailUtils;
  const config = window.PROPERTYDESK_CONFIG || {};
  const configured = Boolean(config.supabaseUrl && config.supabaseAnonKey && window.supabase);
  const state = { client: null, user: null, workspaceOwnerId: null, workspaceMembers: [], propertyHolders: [], depositEntries: [], reminderLogs: [], view: 'properties', properties: [], accounts: [], payments: [], expenses: [], documents: [], agreementVersions: [], importBatches: [], pendingImport: null, pendingCorrection: null, editingProperty: null, editingAccount: null, selectedPropertyId: null, auditRequestId: 0, passwordRecoveryInProgress: false, toastTimer: null };
  const money = (value) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(Number(value || 0));
  const dateOnly = (value) => value ? new Date(`${value}T12:00:00`) : null;
  const fmtDate = (value, opts = { month: 'short', day: 'numeric', year: 'numeric' }) => { const d = dateOnly(value); return d ? d.toLocaleDateString(undefined, opts) : '—'; };
  const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  function setTheme(theme, persist = false) {
    const next = theme === 'light' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', next === 'dark' ? '#151b17' : '#f6f7f4');
    if (persist) { try { localStorage.setItem('propertydesk-theme', next); } catch { /* Keep the active theme for this page. */ } }
    document.querySelectorAll('[data-theme-toggle]').forEach(button => {
      const action = next === 'dark' ? 'light' : 'dark';
      button.setAttribute('aria-label', `Switch to ${action} mode`);
      button.setAttribute('aria-pressed', String(next === 'dark'));
      const label = button.querySelector('.theme-label'); if (label) label.textContent = `${action[0].toUpperCase()}${action.slice(1)} mode`;
      const icon = button.querySelector('.theme-icon'); if (icon) icon.textContent = next === 'dark' ? '☼' : '☾';
    });
  }
  function syncThemeButtons() { setTheme(document.documentElement.dataset.theme); }
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
  function moneyInput(value) { const raw=String(value??'').trim(),negative=/^\(.*\)$/.test(raw),normalized=raw.replace(/[,$\s()]/g,'');const n=Number(normalized)*(negative?-1:1);return Number.isFinite(n)?Math.round((n+Number.EPSILON)*100)/100:0; }
  function accountBalance(account, asOf = todayIso()) {
    return scheduledLoanBalance(account, asOf);
  }
  function paymentFrequencyLabel(f) { return ({ monthly: 'Monthly', weekly: 'Weekly', biweekly: 'Every 2 weeks', quarterly: 'Quarterly', annual: 'Annually' }[f] || 'Monthly'); }
  function scheduledMonthlyRunRate() { return monthlyScheduledEstimate(state.accounts); }
  function collectedSince(date) { return sumPosted(state.payments.filter(p => String(p.received_date) >= date)); }
  function depositLedger(accountId) {
    const entries=state.depositEntries.filter(row=>row.account_id===accountId);
    const result=securityDepositBalance(entries,state.payments,state.expenses);
    return {...result,entries};
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
  const { openPropertyDetails, openAccountDetails } =
    window.PropertyDeskDetailViews.create({
      $, state, isPosted, sumIncome, sumOperatingExpenses, money, fmtDate, esc,
      prettyType, paymentFrequencyLabel, accountBalance, scheduleFor,
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

  async function fetchAll() {
    const {data:workspaceId,error:workspaceError}=await state.client.rpc('pd_workspace_id');
    if(workspaceError||!workspaceId){toast(workspaceError?.message||'Could not load this workspace');throw workspaceError||new Error('Missing workspace');}
    state.workspaceOwnerId=workspaceId;
    const [pr, ar, pay, exp, batches, docs, versions, holders, members, deposits, reminders] = await Promise.all([
      state.client.from('pd_properties').select('*').eq('user_id',workspaceId).order('created_at', { ascending: false }),
      state.client.from('pd_accounts').select('*').eq('user_id',workspaceId).order('created_at', { ascending: false }),
      state.client.from('pd_payments').select('*').eq('user_id',workspaceId).order('received_date', { ascending: false }).order('recorded_at', { ascending: false }),
      state.client.from('pd_expenses').select('*').eq('user_id',workspaceId).order('expense_date', { ascending: false }).order('recorded_at', { ascending: false }),
      state.client.from('pd_import_batches').select('*').eq('user_id',workspaceId).order('created_at', { ascending: false }),
      state.client.from('pd_documents').select('*').eq('user_id',workspaceId).order('created_at', { ascending: false }),
      state.client.from('pd_agreement_versions').select('*').eq('user_id',workspaceId).order('replaced_on', { ascending: false }),
      state.client.from('pd_property_holders').select('*').eq('user_id',workspaceId),
      state.client.rpc('pd_list_workspace_members'),
      state.client.from('pd_deposit_entries').select('*').eq('user_id',workspaceId).order('movement_date',{ascending:false}).order('created_at',{ascending:false}),
      state.client.from('pd_reminder_logs').select('*').eq('user_id',workspaceId).order('attempted_at',{ascending:false}).limit(300)
    ]);
    const error = pr.error || ar.error || pay.error || exp.error || batches.error || docs.error || versions.error || holders.error || members.error || deposits.error || reminders.error;
    if (error) { toast(error.message); throw error; }
    state.properties = pr.data || []; state.accounts = ar.data || []; state.payments = pay.data || []; state.expenses = exp.data || []; state.depositEntries=deposits.data||[];state.reminderLogs=reminders.data||[];state.importBatches = batches.data || []; state.documents = docs.data || []; state.agreementVersions = versions.data || []; state.propertyHolders=holders.data||[];state.workspaceMembers=members.data||[];
    render();
  }
  function showAuth() { $('auth-view').classList.remove('hidden'); $('app-view').classList.add('hidden'); }
  function showApp() { $('auth-view').classList.add('hidden'); $('app-view').classList.remove('hidden'); }
  function showConfigError() {
    const banner = $('config-banner'); banner.innerHTML = 'Supabase is not configured. Copy <code>config.example.js</code> to <code>config.js</code>, add your project URL and anon key, then reload.'; banner.classList.remove('hidden');
    $('auth-title').textContent = 'Connect your workspace'; document.querySelector('.auth-intro').textContent = 'Add your Supabase project settings to start your private PropertyDesk workspace.';
    $('auth-form').classList.add('hidden'); $('password-reset-form').classList.add('hidden'); $('forgot-password').classList.add('hidden'); $('auth-toggle').classList.add('hidden'); document.querySelector('.privacy-note').classList.add('hidden'); showAuth();
  }
  function render() { updateGreeting(); renderOverview(); renderProperties(); renderPayments(); renderReports(); }
  function navigate(view) {
    state.view=view; document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x.id===`page-${view}`)); document.querySelectorAll('.nav-link').forEach(x=>x.classList.toggle('active',x.dataset.view===view));
    $('page-crumb').textContent=view.charAt(0).toUpperCase()+view.slice(1); window.scrollTo({top:0,behavior:'smooth'});
  }
  function openModal(id) { $(id).classList.remove('hidden'); document.body.style.overflow='hidden'; }
  function closeModal(modal) { modal.classList.add('hidden'); document.body.style.overflow=''; if(modal.id==='import-preview-modal')state.pendingImport=null; if(modal.id==='detail-modal')state.auditRequestId++; if(modal.id==='payment-modal'||modal.id==='expense-modal'){state.pendingCorrection=null;if(modal.id==='payment-modal'){$('payment-modal-title').textContent='Record payment';$('payment-modal').querySelector('.eyebrow').textContent='PAYMENT ENTRY';$('payment-save-button').textContent='Save payment';$('payment-save-next').classList.remove('hidden');}else{$('expense-modal-title').textContent='Record expense';$('expense-modal').querySelector('.eyebrow').textContent='PROPERTY EXPENSE';$('expense-save-button').textContent='Save expense';$('expense-save-next').classList.remove('hidden');}} }
  function fillSelect(id, options, placeholder) {
    const el=$(id); el.innerHTML=`<option value="">${esc(placeholder)}</option>`+options.map(o=>`<option value="${esc(o.value)}">${esc(o.label)}</option>`).join('');
  }
  function populateFormOptions() {
    fillSelect('account-property',state.properties.map(p=>({value:p.id,label:`${p.name} — ${propertyAddress(p)}`})),'Choose a property');
    fillSelect('payment-account',state.accounts.filter(a=>a.status==='active').map(a=>({value:a.id,label:`${a.party_name||a.name} — ${prettyType(a.account_type)}`})),'Choose an account');
    fillSelect('expense-property',state.properties.map(p=>({value:p.id,label:`${p.name} — ${propertyAddress(p)}`})),'Choose a property');
    fillSelect('expense-account',state.accounts.map(a=>({value:a.id,label:`${a.name} — ${prettyType(a.account_type)}`})),'Property level');
  }
  function resetPropertyForm() { $('property-form').reset(); $('property-id').value=''; $('property-modal-title').textContent='Add property'; }
  async function editPropertyQuickNote(id) {
    const property=state.properties.find(item=>item.id===id); if(!property)return;
    const entered=prompt(`Quick note shown under ${streetAddress(property)} (140 characters max):`,property.notes||'');
    if(entered===null)return;
    const note=entered.replace(/\s+/g,' ').trim();
    if(note.length>140){toast('Quick notes are limited to 140 characters.');return;}
    const {error}=await state.client.from('pd_properties').update({notes:note||null}).eq('id',id).eq('user_id',state.workspaceOwnerId);
    if(error){toast(error.message);return;}
    await fetchAll(); toast(note?'Property note saved':'Property note removed');
  }
  function resetAccountForm() { $('account-form').reset(); $('account-id').value=''; $('account-start').value=todayIso(); $('account-payment').value='0'; $('account-balance-adjustment').value='0'; $('account-late-fee').value='0'; $('account-grace').value='0'; $('account-reminder-enabled').checked=false; $('account-modal-title').textContent='Add account'; updateLoanFields(); }
  function updateLoanFields() { const isRental=$('account-type').value==='rental'; $('loan-fields').classList.toggle('hidden',isRental); }

  async function saveProperty(event) {
    event.preventDefault(); const id=$('property-id').value;
    const payload={ user_id:state.workspaceOwnerId, name:$('property-name').value.trim(), address:$('property-address').value.trim(), city:$('property-city').value.trim()||null, state:$('property-state').value.trim().toUpperCase()||null, postal_code:$('property-zip').value.trim()||null, property_kind:$('property-kind').value, notes:$('property-notes').value.trim()||null };
    const q=id?state.client.from('pd_properties').update(payload).eq('id',id):state.client.from('pd_properties').insert(payload); const {error}=await q;
    if(error){toast(error.message);return;} closeModal($('property-modal')); resetPropertyForm(); await fetchAll(); toast(id?'Property updated':'Property added');
  }
  async function saveAccount(event) {
    event.preventDefault(); const id=$('account-id').value, type=$('account-type').value;
    const partyEmails=$('account-party-email').value.split(/[;,]/).map(email=>email.trim()).filter(Boolean);
    if(partyEmails.some(email=>!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))){toast('Check each tenant/buyer email address.');return;}
    if($('account-reminder-enabled').checked&&!partyEmails.length){toast('Add at least one tenant/buyer email before enabling reminders.');return;}
    const payload={user_id:state.workspaceOwnerId,property_id:$('account-property').value,account_type:type,name:$('account-name').value.trim(),party_name:$('account-party').value.trim()||null,party_email:partyEmails.join(', ')||null,party_phone:$('account-party-phone').value.trim()||null,monthly_reminder_enabled:$('account-reminder-enabled').checked,start_date:$('account-start').value,next_due_date:$('account-next-due').value||null,payment_amount:moneyInput($('account-payment').value),payment_frequency:$('account-frequency').value,original_principal:type==='rental'?0:moneyInput($('account-principal').value),principal_interest_amount:type==='rental'||!$('account-pi-payment').value?null:moneyInput($('account-pi-payment').value),escrow_amount:type==='rental'?0:moneyInput($('account-escrow').value),balance_adjustment:type==='rental'?0:moneyInput($('account-balance-adjustment').value),interest_rate:type==='rental'?0:Number($('account-rate').value||0),term_months:type==='rental'||!$('account-term').value?null:Number($('account-term').value),balloon_date:type==='rental'?null:$('account-balloon').value||null,agreement_effective_date:$('account-effective-date').value||null,agreement_change_reason:$('account-change-reason').value.trim()||null,late_fee:moneyInput($('account-late-fee').value),grace_days:Number($('account-grace').value||0),notes:$('account-notes').value.trim()||null};
    const q=id?state.client.from('pd_accounts').update(payload).eq('id',id):state.client.from('pd_accounts').insert(payload); const {error}=await q;
    if(error){toast(error.message);return;} closeModal($('account-modal')); resetAccountForm(); await fetchAll(); toast(id?'Account updated':'Account added');
  }
  function updateAllocationPreview() {
    const a=state.accounts.find(x=>x.id===$('payment-account').value), amount=moneyInput($('payment-amount').value);
    if(!a||!amount){$('allocation-preview').innerHTML='';return;}
    $('income-category-wrap').classList.toggle('hidden',a.account_type!=='rental');
    if(a.account_type==='rental'){$('allocation-preview').innerHTML='';return;}
    $('allocation-preview').innerHTML='<p class="allocation-note">Payment history only. The estimated loan balance assumes every scheduled installment was paid on time; recorded receipts affect Unpaid Due, not this estimate.</p>';
  }
  async function savePayment(event) {
    event.preventDefault(); const addAnother=event.submitter?.id==='payment-save-next',account=state.accounts.find(a=>a.id===$('payment-account').value), amount=moneyInput($('payment-amount').value); if(!account||!amount)return;
    // Log whether the installment arrived; don't estimate a payoff allocation from the receipt.
    // Keep the legacy database allocation constraint satisfied by recording loan receipts as unapplied.
    const alloc=account.account_type==='rental'?{principal:0,interest:0,fee:0,escrow:0,unapplied:0}:{principal:0,interest:0,fee:0,escrow:0,unapplied:amount};
    const payload={user_id:state.workspaceOwnerId,account_id:account.id,amount,received_date:$('payment-date').value,payment_method:$('payment-method').value,income_category:account.account_type==='rental'?$('income-category').value:'installment',principal_amount:alloc.principal,interest_amount:alloc.interest,fee_amount:alloc.fee,escrow_amount:alloc.escrow,unapplied_amount:alloc.unapplied,memo:$('payment-memo').value.trim()||null,source_type:'manual'};
    if(state.pendingCorrection?.kind==='payment'){
      const {error}=await state.client.rpc('pd_correct_transaction',{p_kind:'payment',p_transaction_id:state.pendingCorrection.id,p_correction:{account_id:payload.account_id,amount:payload.amount,received_date:payload.received_date,payment_method:payload.payment_method,income_category:payload.income_category,principal_amount:payload.principal_amount,interest_amount:payload.interest_amount,fee_amount:payload.fee_amount,escrow_amount:payload.escrow_amount,unapplied_amount:payload.unapplied_amount,memo:payload.memo},p_reason:state.pendingCorrection.reason});
      if(error){toast(`Correction failed; original entry is unchanged. ${error.message}`);return;}
      closeModal($('payment-modal'));await fetchAll();toast('Payment corrected; original kept in history');return;
    }
    const {error}=await state.client.from('pd_payments').insert(payload); if(error){toast(error.message);return;}
    $('payment-form').reset(); $('payment-date').value=todayIso(); $('payment-account').value=account.id; await fetchAll();
    if(addAnother){updateAllocationPreview();$('payment-amount').focus();toast('Payment recorded. Ready for the next entry');return;}
    closeModal($('payment-modal')); toast('Payment recorded');
  }
  async function saveExpense(event) {
    event.preventDefault();
    const addAnother=event.submitter?.id==='expense-save-next',propertyId=$('expense-property').value,accountId=$('expense-account').value,category=$('expense-category').value,payee=$('expense-payee').value.trim(),method=$('expense-method').value;
    const account=state.accounts.find(item=>item.id===accountId);
    if(category==='deposit_refund'&&account?.account_type!=='rental'){toast('Choose a rental account for a security deposit refund');return;}
    const payload={user_id:state.workspaceOwnerId,property_id:propertyId,account_id:accountId||null,amount:moneyInput($('expense-amount').value),expense_date:$('expense-date').value,category,payee:payee||null,payment_method:method,memo:$('expense-memo').value.trim()||null,source_type:'manual'};
    if(state.pendingCorrection?.kind==='expense'){
      const {error}=await state.client.rpc('pd_correct_transaction',{p_kind:'expense',p_transaction_id:state.pendingCorrection.id,p_correction:{property_id:payload.property_id,account_id:payload.account_id,amount:payload.amount,expense_date:payload.expense_date,category:payload.category,payee:payload.payee,payment_method:payload.payment_method,memo:payload.memo},p_reason:state.pendingCorrection.reason});
      if(error){toast(`Correction failed; original entry is unchanged. ${error.message}`);return;}
      closeModal($('expense-modal'));await fetchAll();toast('Expense corrected; original kept in history');return;
    }
    const {error}=await state.client.from('pd_expenses').insert(payload);if(error){toast(error.message);return;}
    $('expense-form').reset();$('expense-date').value=todayIso();await fetchAll();
    if(addAnother){$('expense-property').value=propertyId;$('expense-property').dispatchEvent(new Event('change'));$('expense-account').value=accountId;$('expense-category').value=category;$('expense-payee').value=payee;$('expense-method').value=method;$('expense-amount').focus();toast('Expense recorded. Ready for the next entry');return;}
    closeModal($('expense-modal'));toast('Expense recorded');
  }
  function scheduleFor(account) {
    return amortizationSchedule(account.original_principal,account.interest_rate,account.term_months,account.start_date,account.principal_interest_amount);
  }
  async function uploadPropertyDocument(input) {
    const file=input.files?.[0], propertyId=state.selectedPropertyId; input.value=''; if(!file||!propertyId)return;
    const ext=file.name.split('.').pop().toLowerCase(), contentTypes={pdf:'application/pdf',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',jpg:'image/jpeg',jpeg:'image/jpeg'}, contentType=contentTypes[ext];
    if(!contentType||file.size>15*1024*1024){toast('Choose a PDF, DOCX, or JPEG agreement under 15 MB');return;}
    const safeName=file.name.normalize('NFKC').replace(/[^\w.() -]/g,'_').replace(/\s+/g,'_').slice(-100)||`agreement.${ext}`;
    const path=`${state.workspaceOwnerId}/${propertyId}/${crypto.randomUUID()}-${safeName}`;
    const {error:uploadError}=await state.client.storage.from('pd-private-agreements').upload(path,file,{contentType,upsert:false});
    if(uploadError){toast(`Agreement upload failed: ${uploadError.message}`);return;}
    const {error}=await state.client.from('pd_documents').insert({user_id:state.workspaceOwnerId,property_id:propertyId,account_id:null,file_name:file.name,storage_path:path,content_type:file.type||contentType,file_size:file.size});
    if(error){await state.client.storage.from('pd-private-agreements').remove([path]);toast(`Agreement record failed: ${error.message}`);return;}
    toast('Agreement uploaded privately');await fetchAll();openPropertyDetails(propertyId);
  }
  async function deletePropertyDocument(id) {
    const doc=state.documents.find(item=>item.id===id), propertyId=state.selectedPropertyId;
    if(!doc||!propertyId||doc.property_id!==propertyId||doc.user_id!==state.workspaceOwnerId)return;
    if(!window.confirm(`Permanently delete “${doc.file_name}” from this property? This cannot be undone.`))return;
    const {error:storageError}=await state.client.storage.from('pd-private-agreements').remove([doc.storage_path]);
    if(storageError){toast(`Agreement removal failed: ${storageError.message}`);return;}
    const {error}=await state.client.from('pd_documents').delete().eq('id',doc.id).eq('user_id',state.workspaceOwnerId).eq('property_id',propertyId);
    if(error){toast(`File deleted, but its document record could not be removed: ${error.message}`);return;}
    toast('Agreement deleted');await fetchAll();openPropertyDetails(propertyId);
  }
  async function openPropertyDocument(id) {
    const doc=state.documents.find(item=>item.id===id); if(!doc)return;
    const viewer=window.open('about:blank','_blank');
    if(!viewer){toast('Allow pop-ups to open this agreement; you can also use Download.');return;}
    viewer.opener=null;
    const {data,error}=await state.client.storage.from('pd-private-agreements').createSignedUrl(doc.storage_path,60);
    if(error){viewer.close();toast(`Agreement link failed: ${error.message}`);return;}
    viewer.location.href=data.signedUrl;
  }
  async function saveProfile(event){event.preventDefault();const display_name=$('display-name').value.trim();if(!display_name){toast('Enter a display name');return;}const {data,error}=await state.client.auth.updateUser({data:{display_name}});if(error){toast(error.message);return;}state.user=data.user||state.user;updateGreeting();toast('Display name saved');}
  async function addWorkspaceMember(event){event.preventDefault();const email=$('member-email').value.trim();if(!email)return;const {error}=await state.client.rpc('pd_add_workspace_member',{p_email:email});if(error){toast(error.message);return;} $('member-email').value='';await fetchAll();renderWorkspaceSettings();toast('Workspace member added');}
  async function removeWorkspaceMember(memberId){const member=state.workspaceMembers.find(x=>x.member_user_id===memberId);if(!member||!confirm(`Remove ${member.display_name||member.email} from this workspace?`))return;const {error}=await state.client.rpc('pd_remove_workspace_member',{p_member_user_id:memberId});if(error){toast(error.message);return;}await fetchAll();renderWorkspaceSettings();toast('Workspace access removed');}
  function renderWorkspaceSettings(){
    $('display-name').value=state.user?.user_metadata?.display_name||'';
    $('workspace-members').innerHTML=state.workspaceMembers.map(m=>`<div class="member-row"><div><strong>${esc(m.display_name||m.email)}</strong><small>${esc(m.email)}${m.is_owner?' · Owner':' · Full workspace access'}</small></div>${m.is_owner?'<span class="kind-pill">Owner</span>':`<button class="text-button" type="button" data-remove-member="${esc(m.member_user_id)}">Remove</button>`}</div>`).join('');
    $('member-add-form').classList.toggle('hidden',state.workspaceOwnerId!==state.user?.id);
    $('reminder-activity').innerHTML=state.reminderLogs.length?state.reminderLogs.map(log=>{const account=state.accounts.find(item=>item.id===log.account_id),property=state.properties.find(item=>item.id===account?.property_id),status=log.status==='accepted'?'Accepted by MailerSend':log.status==='failed'?'Failed':log.status==='skipped'?'Skipped':'Sending';const detail=log.reason==='payment_recorded_this_month'?'A payment was recorded this month':log.reason==='no_unpaid_scheduled_amount'?'No scheduled amount was due':log.reason==='missing_recipient_email'?'No valid recipient email is saved':log.reason?.startsWith('mailersend_http_')?'MailerSend rejected the request':log.reason==='mailersend_request_failed'?'MailerSend request failed':log.reason||'Month-end check';return `<tr><td>${fmtDate(log.reminder_month,{month:'short',year:'numeric'})}</td><td>${esc(property?.address||property?.name||'Property')}<small class="table-subtext">${esc(account?.party_name||account?.name||'Account')}</small></td><td>${esc(log.recipient_email||'—')}</td><td><span class="reminder-status reminder-${esc(log.status)}">${esc(status)}</span></td><td>${esc(detail)}${log.unpaid_due!=null?`<small class="table-subtext">Unpaid due: ${money(log.unpaid_due)}</small>`:''}</td><td>${esc(new Date(log.attempted_at).toLocaleString())}</td></tr>`}).join(''):'<tr><td colspan="6" class="muted">Reminder attempts will appear here. Reminders are off until you enable them in an account.</td></tr>';
  }
  function previewReminderEmail(){
    const property=state.properties.find(item=>item.id===$('account-property').value);
    if(!property){toast('Choose a property to preview its reminder');return;}
    const account={id:$('account-id').value||'preview',property_id:property.id,account_type:$('account-type').value,name:$('account-name').value.trim()||'Account',party_name:$('account-party').value.trim()||null,start_date:$('account-start').value||todayIso(),next_due_date:$('account-next-due').value||null,payment_amount:moneyInput($('account-payment').value),payment_frequency:$('account-frequency').value,status:'active'};
    const recipients=$('account-party-email').value.split(/[;,]/).map(email=>email.trim()).filter(Boolean);
    const amount=amountDueSince([account],state.payments,unpaidDueAccrualStart(account),monthEnd());
    const label=dateOnly(monthStart()).toLocaleDateString(undefined,{month:'long',year:'numeric'}),address=propertyAddress(property),name=account.party_name||'there';
    const subject=`Payment reminder for ${property.address} · ${label}`;
    const body=`Hello ${name},\n\nOur records show no rent or installment payment recorded for ${label}.\n\nUnpaid due as of ${monthEnd()}: ${money(amount)}\nProperty: ${address}\n\nIf you have already paid or believe this is incorrect, please contact your landlord or seller.\n\nThank you,\nPropertyDesk`;
    $('reminder-preview-content').innerHTML=`<div class="reminder-preview-meta"><div><small>To</small><strong>${esc(recipients.join(', ')||'No recipient email saved')}</strong></div><div><small>Subject</small><strong>${esc(subject)}</strong></div><div><small>Schedule</small><strong>Last day of ${esc(label)}, only when no rent or installment payment is recorded that month</strong></div></div><div class="reminder-preview-body">${esc(body).replaceAll('\n','<br>')}</div><p class="field-hint">Preview only. No email is sent from this window. Each saved address receives an individual copy. Estimated loan balance is not included.</p>`;
    openModal('reminder-preview-modal');
  }
  async function savePropertyHolders(){const id=state.selectedPropertyId,selected=[...document.querySelectorAll('[data-holder-choice]:checked')].map(x=>x.value);if(!id)return;const {error:delError}=await state.client.from('pd_property_holders').delete().eq('user_id',state.workspaceOwnerId).eq('property_id',id);if(delError){toast(delError.message);return;}if(selected.length){const {error}=await state.client.from('pd_property_holders').insert(selected.map(member_user_id=>({user_id:state.workspaceOwnerId,property_id:id,member_user_id})));if(error){toast(error.message);await fetchAll();openPropertyDetails(id);return;}}await fetchAll();openPropertyDetails(id);toast('Account-holder labels saved');}
  async function toggleArchiveProperty(){const id=state.selectedPropertyId,p=state.properties.find(x=>x.id===id);if(!p)return;const archived_at=p.archived_at?null:todayIso();const {error}=await state.client.from('pd_properties').update({archived_at}).eq('id',id).eq('user_id',state.workspaceOwnerId);if(error){toast(error.message);return;}await fetchAll();openPropertyDetails(id);toast(archived_at?'Property archived':'Property restored');}
  async function recordDepositAdjustment(accountId,type){
    const account=state.accounts.find(row=>row.id===accountId);if(!account||account.account_type!=='rental')return;
    const action=type==='retained'?'retained from the deposit':'restored to the held balance';
    const amount=moneyInput(prompt(`Amount ${action}?`,'0.00'));if(amount<=0){toast('Enter an amount greater than zero');return;}
    const reason=prompt('Add a reason for the deposit ledger:');if(reason===null)return;if(!reason.trim()){toast('Enter a reason so this adjustment can be audited');return;}
    const {error}=await state.client.from('pd_deposit_entries').insert({user_id:state.workspaceOwnerId,account_id:accountId,entry_type:type,amount,movement_date:todayIso(),reason:reason.trim()});
    if(error){toast(`Deposit adjustment failed: ${error.message}`);return;}
    await fetchAll();await openAccountDetails(accountId);toast(type==='retained'?'Deposit retention recorded':'Deposit retention reversed');
  }
  async function deleteAccount(a) { if(!confirm(`Close “${a.name}”? Its payment history will remain in your records.`))return; const {error}=await state.client.from('pd_accounts').update({status:'closed'}).eq('id',a.id);if(error){toast(error.message);return;}closeModal($('detail-modal'));await fetchAll();toast('Account closed'); }
  async function voidTransaction(kind,id) { const table=kind==='income'?'pd_payments':'pd_expenses';if(!confirm(`Void this ${kind==='income'?'income entry':'expense'}? It will remain in the audit history but stop affecting balances and reports.`))return;const reason=prompt('Optional reason for the audit record:','Entered in error');if(reason===null)return;const {data,error}=await state.client.from(table).update({status:'voided',voided_at:new Date().toISOString(),void_reason:reason.trim()||'Voided by owner'}).eq('id',id).eq('status','posted').select('id').maybeSingle();if(error){toast(error.message);return;}if(!data){toast('This transaction was already voided or is no longer available.');return;}await fetchAll();toast('Transaction voided; original entry preserved'); }
  function editAccount(a) {
    resetAccountForm(); populateFormOptions(); $('account-modal-title').textContent='Edit account'; $('account-id').value=a.id; $('account-type').value=a.account_type; updateLoanFields(); $('account-property').value=a.property_id; $('account-name').value=a.name; $('account-party').value=a.party_name||''; $('account-party-email').value=a.party_email||'';$('account-party-phone').value=a.party_phone||'';$('account-reminder-enabled').checked=Boolean(a.monthly_reminder_enabled); $('account-start').value=a.start_date; $('account-next-due').value=a.next_due_date||''; $('account-payment').value=a.payment_amount; $('account-frequency').value=a.payment_frequency; $('account-principal').value=a.original_principal; $('account-pi-payment').value=a.principal_interest_amount||''; $('account-escrow').value=a.escrow_amount||'0'; $('account-balance-adjustment').value=a.balance_adjustment||'0'; $('account-effective-date').value=a.agreement_effective_date||''; $('account-change-reason').value=''; $('account-rate').value=a.interest_rate; $('account-term').value=a.term_months||''; $('account-balloon').value=a.balloon_date||''; $('account-late-fee').value=a.late_fee; $('account-grace').value=a.grace_days; $('account-notes').value=a.notes||''; openModal('account-modal');
  }
  function openPayment(accountId, propertyId = null) { state.pendingCorrection=null;populateFormOptions(); if(propertyId)fillSelect('payment-account',state.accounts.filter(a=>a.property_id===propertyId&&a.status==='active').map(a=>({value:a.id,label:`${a.party_name||a.name} — ${prettyType(a.account_type)}`})),'Choose an account'); $('payment-form').reset();$('payment-modal-title').textContent='Record payment';$('payment-modal').querySelector('.eyebrow').textContent='PAYMENT ENTRY';$('payment-save-button').textContent='Save payment';$('payment-save-next').classList.remove('hidden'); $('payment-date').value=todayIso(); if(accountId)$('payment-account').value=accountId; updateAllocationPreview(); openModal('payment-modal'); }
  function openPropertyPayment(propertyId) { const accounts=state.accounts.filter(a=>a.property_id===propertyId&&a.status==='active'); if(!accounts.length){toast('Add an active account before recording a payment');return;}openPayment(accounts.length===1?accounts[0].id:null,propertyId); }
  function openExpense(propertyId) { state.pendingCorrection=null;populateFormOptions(); $('expense-form').reset();$('expense-modal-title').textContent='Record expense';$('expense-modal').querySelector('.eyebrow').textContent='PROPERTY EXPENSE';$('expense-save-button').textContent='Save expense';$('expense-save-next').classList.remove('hidden');$('expense-date').value=todayIso();$('deposit-refund-hint').classList.add('hidden'); if(propertyId)$('expense-property').value=propertyId; openModal('expense-modal'); }
  function correctTransaction(kind,id) {
    const payment=kind==='income'?state.payments.find(x=>x.id===id):null,expense=kind==='expense'?state.expenses.find(x=>x.id===id):null,item=payment||expense;
    if(!item||item.status!=='posted'){toast('Only posted transactions can be corrected');return;}
    const reason=prompt(`Why are you correcting this ${kind==='income'?'income entry':'expense'}?`,'Entered in error');if(reason===null)return;
    const auditReason=reason.trim()||'Corrected by owner';
    if(payment){
      openPayment();
      const account=state.accounts.find(x=>x.id===payment.account_id),select=$('payment-account');
      if(account&&![...select.options].some(option=>option.value===account.id))select.add(new Option(`${account.party_name||account.name} — ${prettyType(account.account_type)} (closed)`,account.id));
      select.value=payment.account_id;$('payment-amount').value=payment.amount;$('payment-date').value=payment.received_date;$('payment-method').value=payment.payment_method;$('income-category').value=payment.income_category;$('payment-memo').value=payment.memo||'';
      updateAllocationPreview();
      state.pendingCorrection={kind:'payment',id,reason:auditReason};$('payment-modal-title').textContent='Correct payment';$('payment-modal').querySelector('.eyebrow').textContent='TRANSACTION CORRECTION';$('payment-save-button').textContent='Save correction';$('payment-save-next').classList.add('hidden');
    }else{
      openExpense();$('expense-property').value=expense.property_id;$('expense-property').dispatchEvent(new Event('change'));$('expense-account').value=expense.account_id||'';$('expense-amount').value=expense.amount;$('expense-date').value=expense.expense_date;$('expense-category').value=expense.category;$('expense-category').dispatchEvent(new Event('change'));$('expense-payee').value=expense.payee||'';$('expense-method').value=expense.payment_method;$('expense-memo').value=expense.memo||'';
      state.pendingCorrection={kind:'expense',id,reason:auditReason};$('expense-modal-title').textContent='Correct expense';$('expense-modal').querySelector('.eyebrow').textContent='TRANSACTION CORRECTION';$('expense-save-button').textContent='Save correction';$('expense-save-next').classList.add('hidden');
    }
  }
  function setAuthMode(signup) { $('auth-form').classList.remove('hidden'); $('password-reset-form').classList.add('hidden'); $('forgot-password').classList.toggle('hidden',signup); $('auth-toggle').classList.remove('hidden'); $('auth-form').dataset.mode=signup?'signup':'signin'; $('auth-title').textContent=signup?'Create your account':'Welcome back'; document.querySelector('.auth-intro').textContent=signup?'Set up your private PropertyDesk workspace.':'Sign in to manage your properties and accounts.'; $('auth-submit').textContent=signup?'Create account':'Sign in'; $('auth-password').autocomplete=signup?'new-password':'current-password'; $('auth-toggle').textContent=signup?'Already have an account? Sign in':'Create an account'; $('auth-message').textContent=''; }
  function showPasswordReset() { state.passwordRecoveryInProgress=true; $('auth-title').textContent='Choose a new password'; document.querySelector('.auth-intro').textContent='Your reset link is verified. Set a new password for your private workspace.'; $('auth-form').classList.add('hidden'); $('password-reset-form').classList.remove('hidden'); $('forgot-password').classList.add('hidden'); $('auth-toggle').classList.add('hidden'); $('auth-message').textContent=''; showAuth(); }
  async function requestPasswordReset() { const email=$('auth-email').value.trim(); if(!$('auth-email').reportValidity())return; $('forgot-password').disabled=true; try { const redirectTo=`${window.location.origin}${window.location.pathname}`; const {error}=await state.client.auth.resetPasswordForEmail(email,{redirectTo}); $('auth-message').textContent=error?'Unable to request a reset right now. Try again later.':'If that email has a PropertyDesk account, a reset link is on its way.'; } catch { $('auth-message').textContent='Unable to request a reset right now. Try again later.'; } finally { $('forgot-password').disabled=false; } }
  async function submitPasswordReset(event) { event.preventDefault(); const password=$('reset-password').value; if(password!==$('reset-password-confirm').value){$('auth-message').textContent='Those passwords do not match.';return;} $('reset-password-submit').disabled=true; $('reset-password-submit').textContent='Updating…'; const {data,error}=await state.client.auth.updateUser({password}); $('reset-password-submit').disabled=false; $('reset-password-submit').textContent='Update password'; if(error){$('auth-message').textContent=error.message;return;} state.user=data.user||state.user; state.passwordRecoveryInProgress=false; window.history.replaceState(null,'',`${window.location.pathname}${window.location.search}`); setAuthMode(false); await startWorkspace(); toast('Password updated'); }
  async function submitAuth(event) { event.preventDefault(); const email=$('auth-email').value.trim(), password=$('auth-password').value, signup=$('auth-form').dataset.mode==='signup'; $('auth-submit').disabled=true; $('auth-submit').textContent='Please wait…'; let result;
    if(signup) result=await state.client.auth.signUp({email,password}); else result=await state.client.auth.signInWithPassword({email,password});
    $('auth-submit').disabled=false; $('auth-submit').textContent=signup?'Create account':'Sign in';
    if(result.error){$('auth-message').textContent=result.error.message;return;}
    if(signup&&!result.data.session){$('auth-message').textContent='Check your email to confirm your account, then come back to sign in.';return;}
    $('auth-message').textContent=''; if(result.data.user){state.user=result.data.user; await startWorkspace();}
  }
  async function startWorkspace() { showApp(); try { await fetchAll(); } catch { /* fetchAll already reports the failure */ } }

  function csvCell(v){const s=String(v??'');return /[",\r\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;}
  function downloadCSV(filename,headers,rows){const csv=[headers,...rows].map(row=>row.map(csvCell).join(',')).join('\r\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  async function exportAll(){
    if(!state.user||!state.client){toast('Sign in before exporting your private records.');return;}
    const tables=['pd_properties','pd_accounts','pd_agreement_versions','pd_payments','pd_expenses','pd_deposit_entries','pd_documents','pd_import_batches','pd_audit_events','pd_workspace_members','pd_property_holders'];
    const button=$('export-all'),originalLabel=button.textContent;
    button.disabled=true;button.textContent='Preparing backup…';toast('Preparing a private backup with agreement files…');
    try{
      const exportTable=async table=>{
        const pageSize=500,rows=[];
        for(let offset=0;;offset+=pageSize){
          const {data,error}=await state.client.from(table).select('*').range(offset,offset+pageSize-1);
          if(error)throw error;
          rows.push(...(data||[]));
          if(!data||data.length<pageSize)break;
        }
        return rows;
      };
      const values=await Promise.all(tables.map(exportTable));
      const records=Object.fromEntries(tables.map((table,index)=>[table,values[index]]));
      const includedFiles=[],entries=[],ownerPrefix=`${state.workspaceOwnerId}/`;
      for(const doc of records.pd_documents){
        if(!doc.storage_path||!doc.storage_path.startsWith(ownerPrefix))throw new Error('An agreement record has an invalid private storage path. No backup was downloaded.');
        const {data,error}=await state.client.storage.from('pd-private-agreements').download(doc.storage_path);
        if(error||!data)throw new Error(`Could not download agreement “${doc.file_name||'file'}”. ${error?.message||''}`);
        const safeName=String(doc.file_name||'agreement').normalize('NFKC').replace(/[^\w.-]/g,'_').slice(-100)||'agreement';
        const path=`agreements/${doc.property_id||'unassigned'}/${doc.id}-${safeName}`;
        const bytes=new Uint8Array(await data.arrayBuffer());
        entries.push({name:path,data:bytes});
        includedFiles.push({path,file_name:doc.file_name,content_type:doc.content_type,file_size:bytes.byteLength,property_id:doc.property_id,account_id:doc.account_id});
      }
      const backup=createBackup(records,new Date().toISOString(),includedFiles);
      entries.unshift({name:'propertydesk-backup.json',data:JSON.stringify(backup,null,2)});
      const blob=window.PropertyDeskZipUtils.createZip(entries),url=URL.createObjectURL(blob),link=document.createElement('a');
      link.href=url;link.download=`propertydesk-backup-${todayIso()}.zip`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
      toast(`Private ZIP backup exported · ${tables.reduce((sum,table)=>sum+records[table].length,0)} records · ${includedFiles.length} agreement files`);
    }catch(error){toast(`Backup failed; no file was downloaded. ${error.message||'Check your connection and try again.'}`);}
    finally{button.disabled=false;button.textContent=originalLabel;}
  }
  function exportReport(){downloadCSV(`propertydesk-accounts-${todayIso()}.csv`,['account_name','account_type','property','party','monthly_due','estimated_on_time_loan_balance','next_due_date','status'],state.accounts.map(a=>[a.name,prettyType(a.account_type),state.properties.find(p=>p.id===a.property_id)?.name||'',a.party_name,a.payment_amount,a.account_type==='rental'?'':accountBalance(a),a.next_due_date,a.status]));}

  function attachEvents() {
    document.querySelectorAll('[data-theme-toggle]').forEach(button=>button.addEventListener('click',()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark',true)));
    syncThemeButtons();
    document.querySelectorAll('.nav-link').forEach(x=>x.addEventListener('click',()=>{if(x.dataset.view==='workspace')renderWorkspaceSettings();navigate(x.dataset.view);}));
    document.querySelectorAll('[data-goto]').forEach(x=>x.addEventListener('click',()=>navigate(x.dataset.goto)));
    document.querySelectorAll('[data-open="property-modal"]').forEach(x=>x.addEventListener('click',()=>{resetPropertyForm();openModal('property-modal');}));
    document.querySelectorAll('[data-open="account-modal"]').forEach(x=>x.addEventListener('click',()=>{if(!state.properties.length){toast('Add a property before creating an account');navigate('properties');return;}resetAccountForm();populateFormOptions();openModal('account-modal');}));
    document.querySelectorAll('[data-open="payment-modal"]').forEach(x=>x.addEventListener('click',()=>{if(!state.accounts.length){toast('Add an account before recording a payment');navigate('properties');return;}openPayment();}));
    $('quick-payment').addEventListener('click',()=>{if(!state.accounts.length){toast('Add an account before recording a payment');navigate('properties');return;}openPayment();});
    document.querySelectorAll('[data-close]').forEach(x=>x.addEventListener('click',()=>closeModal(x.closest('.modal'))));
    $('property-form').addEventListener('submit',saveProperty); $('account-form').addEventListener('submit',saveAccount); $('account-reminder-preview').addEventListener('click',previewReminderEmail); $('payment-form').addEventListener('submit',savePayment); $('expense-form').addEventListener('submit',saveExpense);
    $('property-detail-content').addEventListener('click',event=>{const button=event.target.closest('[data-edit-account]');if(!button)return;const account=state.accounts.find(item=>item.id===button.dataset.editAccount);if(!account)return;event.preventDefault();closeModal($('property-detail-modal'));editAccount(account);});
    $('account-type').addEventListener('change',updateLoanFields); $('payment-account').addEventListener('change',updateAllocationPreview); $('payment-amount').addEventListener('input',updateAllocationPreview); $('payment-date').addEventListener('change',updateAllocationPreview);
    $('expense-property').addEventListener('change',()=>{const pid=$('expense-property').value,related=state.accounts.filter(a=>a.property_id===pid);fillSelect('expense-account',related.map(a=>({value:a.id,label:`${a.name} — ${prettyType(a.account_type)}`})),'Property level');});
    $('expense-category').addEventListener('change',()=>{$('deposit-refund-hint').classList.toggle('hidden',$('expense-category').value!=='deposit_refund');});
    $('property-search').addEventListener('input',renderProperties); $('property-filter').addEventListener('change',renderProperties); $('property-holder-filter').addEventListener('change',renderProperties); $('show-archived').addEventListener('change',renderProperties); $('payment-search').addEventListener('input',renderPayments); $('payment-period').addEventListener('change',renderPayments); $('transaction-type').addEventListener('change',renderPayments);
    document.addEventListener('click',e=>{const depositAdjustment=e.target.closest('[data-deposit-adjustment]');if(depositAdjustment){recordDepositAdjustment(depositAdjustment.dataset.accountId,depositAdjustment.dataset.depositAdjustment);return;}const removeMember=e.target.closest('[data-remove-member]');if(removeMember){removeWorkspaceMember(removeMember.dataset.removeMember);return;}if(e.target.closest('[data-save-holders]')){savePropertyHolders();return;}const accountPayment=e.target.closest('[data-account-payment]');if(accountPayment){e.preventDefault();e.stopPropagation();openPayment(accountPayment.dataset.accountPayment);return;}const propertyAccount=e.target.closest('[data-property-account]');if(propertyAccount){resetAccountForm();populateFormOptions();$('account-property').value=propertyAccount.dataset.propertyAccount;openModal('account-modal');return;}const propertyNote=e.target.closest('[data-property-note]');if(propertyNote){e.preventDefault();e.stopPropagation();editPropertyQuickNote(propertyNote.dataset.propertyNote);return;}const propertyOpen=e.target.closest('[data-property-open]');if(propertyOpen){openPropertyDetails(propertyOpen.dataset.propertyOpen);return;}const quickPayment=e.target.closest('[data-property-payment]');if(quickPayment){e.preventDefault();e.stopPropagation();openPropertyPayment(quickPayment.dataset.propertyPayment);return;}const deleteDoc=e.target.closest('[data-delete-document]');if(deleteDoc){deletePropertyDocument(deleteDoc.dataset.deleteDocument);return;}const openDoc=e.target.closest('[data-open-document]');if(openDoc){e.preventDefault();e.stopPropagation();openPropertyDocument(openDoc.dataset.openDocument);return;}const correction=e.target.closest('[data-correct-transaction]');if(correction){correctTransaction(correction.dataset.kind,correction.dataset.id);return;}const voidButton=e.target.closest('[data-void-transaction]');if(voidButton){voidTransaction(voidButton.dataset.kind,voidButton.dataset.id);return;}const a=e.target.closest('[data-detail]');if(a){closeModal($('property-detail-modal'));openAccountDetails(a.dataset.detail);return;}const card=e.target.closest('[data-property-card]');if(card){openPropertyDetails(card.dataset.propertyCard);return;}});
    document.addEventListener('change',e=>{if(e.target.matches('[data-property-document]'))uploadPropertyDocument(e.target);});
    $('property-detail-add-income').addEventListener('click',()=>{const propertyId=state.selectedPropertyId;if(!propertyId)return;closeModal($('property-detail-modal'));openPayment(null,propertyId);});
    $('property-detail-add-expense').addEventListener('click',()=>{const propertyId=state.selectedPropertyId;if(!propertyId)return;closeModal($('property-detail-modal'));openExpense(propertyId);});
    $('property-detail-add-account').addEventListener('click',()=>{const propertyId=state.selectedPropertyId;if(!propertyId)return;closeModal($('property-detail-modal'));resetAccountForm();populateFormOptions();$('account-property').value=propertyId;openModal('account-modal');});
    $('display-name-form').addEventListener('submit',saveProfile);$('member-add-form').addEventListener('submit',addWorkspaceMember);$('user-menu').addEventListener('click',()=>{renderWorkspaceSettings();navigate('workspace');});$('property-archive-toggle').addEventListener('click',toggleArchiveProperty);
    $('sign-out').addEventListener('click',async()=>{await state.client.auth.signOut();state.user=null;state.properties=[];state.accounts=[];state.payments=[];showAuth();setAuthMode(false);}); $('auth-toggle').addEventListener('click',()=>setAuthMode($('auth-form').dataset.mode!=='signup')); $('auth-form').addEventListener('submit',submitAuth); $('forgot-password').addEventListener('click',requestPasswordReset); $('password-reset-form').addEventListener('submit',submitPasswordReset); $('reset-password-cancel').addEventListener('click',()=>{state.passwordRecoveryInProgress=false;setAuthMode(false);showAuth();});
    document.querySelectorAll('[data-open="expense-modal"]').forEach(x=>x.addEventListener('click',()=>{if(!state.properties.length){toast('Add a property before recording an expense');navigate('properties');return;}openExpense();}));
    attachImportEvents();
    $('export-all').addEventListener('click',exportAll); $('export-report').addEventListener('click',exportReport);
    document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.modal:not(.hidden)').forEach(closeModal);});
  }

  async function init() {
    attachEvents(); $('payment-date').value=todayIso(); $('account-start').value=todayIso(); setAuthMode(false);
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js').catch(error => console.warn('PropertyDesk shell cache could not be registered:', error));
    if(!configured){showConfigError();return;}
    state.client=window.supabase.createClient(config.supabaseUrl,config.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    state.client.auth.onAuthStateChange((event,sessionNow)=>{if(event==='SIGNED_OUT'){state.user=null;state.passwordRecoveryInProgress=false;showAuth();setAuthMode(false);return;}if(event==='PASSWORD_RECOVERY'&&sessionNow?.user){state.user=sessionNow.user;showPasswordReset();return;}if(sessionNow?.user){const previousUserId=state.user?.id;state.user=sessionNow.user;if(event==='SIGNED_IN'&&previousUserId!==sessionNow.user.id&&!state.passwordRecoveryInProgress)startWorkspace();}});
    const {data:{session}}=await state.client.auth.getSession();
    const recoveryParams=new URLSearchParams(window.location.hash.replace(/^#/,''));
    const recoveryLink=recoveryParams.get('type')==='recovery'&&recoveryParams.get('access_token')===session?.access_token;
    if(session?.user){state.user=session.user;if(recoveryLink)showPasswordReset();else if(!state.passwordRecoveryInProgress)await startWorkspace();} else showAuth();
  }
  document.addEventListener('DOMContentLoaded',init);
})();
