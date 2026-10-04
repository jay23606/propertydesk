/* PropertyDesk: static client backed by Supabase Auth, Postgres and RLS. */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const { parseCSV, selectImportRows } = window.PropertyDeskImportUtils;
  const { validateAccountRows, validateExpenseRows, validatePaymentRows } = window.PropertyDeskImportWorkflows;
  const { amountDueSince, amortizationSchedule, createBackup, isPosted, monthlyScheduledEstimate, scheduledLoanBalance, securityDepositBalance, sumIncome, sumOperatingExpenses, sumPosted, unpaidDueAccrualStart } = window.PropertyDeskLedgerUtils;
  const { lateReminderMailto } = window.PropertyDeskEmailUtils;
  const config = window.PROPERTYDESK_CONFIG || {};
  const configured = Boolean(config.supabaseUrl && config.supabaseAnonKey && window.supabase);
  const state = { client: null, user: null, workspaceOwnerId: null, workspaceMembers: [], propertyHolders: [], depositEntries: [], view: 'overview', properties: [], accounts: [], payments: [], expenses: [], documents: [], agreementVersions: [], importBatches: [], pendingImport: null, pendingCorrection: null, editingProperty: null, editingAccount: null, selectedPropertyId: null, auditRequestId: 0, passwordRecoveryInProgress: false, toastTimer: null };
  const money = (value) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(Number(value || 0));
  const dateOnly = (value) => value ? new Date(`${value}T12:00:00`) : null;
  const fmtDate = (value, opts = { month: 'short', day: 'numeric', year: 'numeric' }) => { const d = dateOnly(value); return d ? d.toLocaleDateString(undefined, opts) : '—'; };
  const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const prettyType = (t) => ({ rental: 'Rental', land_contract: 'Land contract', note: 'Private note' }[t] || t || 'Account');
  const prettyKind = (t) => ({ residential: 'Residential', land: 'Land', commercial: 'Commercial', other: 'Other' }[t] || t || 'Property');
  const monthStart = () => { const d = new Date(); d.setDate(1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; };
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

  async function fetchAll() {
    const {data:workspaceId,error:workspaceError}=await state.client.rpc('pd_workspace_id');
    if(workspaceError||!workspaceId){toast(workspaceError?.message||'Could not load this workspace');throw workspaceError||new Error('Missing workspace');}
    state.workspaceOwnerId=workspaceId;
    const [pr, ar, pay, exp, batches, docs, versions, holders, members, deposits] = await Promise.all([
      state.client.from('pd_properties').select('*').eq('user_id',workspaceId).order('created_at', { ascending: false }),
      state.client.from('pd_accounts').select('*').eq('user_id',workspaceId).order('created_at', { ascending: false }),
      state.client.from('pd_payments').select('*').eq('user_id',workspaceId).order('received_date', { ascending: false }).order('recorded_at', { ascending: false }),
      state.client.from('pd_expenses').select('*').eq('user_id',workspaceId).order('expense_date', { ascending: false }).order('recorded_at', { ascending: false }),
      state.client.from('pd_import_batches').select('*').eq('user_id',workspaceId).order('created_at', { ascending: false }),
      state.client.from('pd_documents').select('*').eq('user_id',workspaceId).order('created_at', { ascending: false }),
      state.client.from('pd_agreement_versions').select('*').eq('user_id',workspaceId).order('replaced_on', { ascending: false }),
      state.client.from('pd_property_holders').select('*').eq('user_id',workspaceId),
      state.client.rpc('pd_list_workspace_members'),
      state.client.from('pd_deposit_entries').select('*').eq('user_id',workspaceId).order('movement_date',{ascending:false}).order('created_at',{ascending:false})
    ]);
    const error = pr.error || ar.error || pay.error || exp.error || batches.error || docs.error || versions.error || holders.error || members.error || deposits.error;
    if (error) { toast(error.message); throw error; }
    state.properties = pr.data || []; state.accounts = ar.data || []; state.payments = pay.data || []; state.expenses = exp.data || []; state.depositEntries=deposits.data||[];state.importBatches = batches.data || []; state.documents = docs.data || []; state.agreementVersions = versions.data || []; state.propertyHolders=holders.data||[];state.workspaceMembers=members.data||[];
    render();
  }
  function showAuth() { $('auth-view').classList.remove('hidden'); $('app-view').classList.add('hidden'); }
  function showApp() { $('auth-view').classList.add('hidden'); $('app-view').classList.remove('hidden'); }
  function showConfigError() {
    const banner = $('config-banner'); banner.innerHTML = 'Supabase is not configured. Copy <code>config.example.js</code> to <code>config.js</code>, add your project URL and anon key, then reload.'; banner.classList.remove('hidden');
    $('auth-title').textContent = 'Connect your workspace'; document.querySelector('.auth-intro').textContent = 'Add your Supabase project settings to start your private PropertyDesk workspace.';
    $('auth-form').classList.add('hidden'); $('password-reset-form').classList.add('hidden'); $('forgot-password').classList.add('hidden'); $('auth-toggle').classList.add('hidden'); document.querySelector('.privacy-note').classList.add('hidden'); showAuth();
  }
  function updateGreeting() {
    const hour = new Date().getHours(); const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    const displayName=state.user?.user_metadata?.display_name||state.user?.email?.split('@')[0]||'there';
    $('greeting-name').textContent = `, ${displayName}`; $('page-overview').querySelector('h1').firstChild.textContent = `${greeting}`;
    $('user-email').textContent = displayName; $('avatar-initial').textContent = displayName.charAt(0).toUpperCase(); $('user-menu').textContent = displayName.charAt(0).toUpperCase();
    $('today-label').textContent = new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }
  function propertyCard(property, compact = false) {
    const related = state.accounts.filter(a => a.property_id === property.id);
    const active = related.filter(a => (a.status || 'active') === 'active');
    const scheduledMonthly = monthlyScheduledEstimate(active);
    const hasNonMonthly = active.some(a => a.payment_frequency !== 'monthly');
    const balance = active.filter(a => a.account_type !== 'rental').reduce((sum,a) => sum + accountBalance(a), 0);
    const amountDue = active.reduce((sum, account) => sum + amountDueSince([account], state.payments, unpaidDueAccrualStart(account), todayIso()), 0);
    const parties = [...new Set(active.map(a => a.party_name).filter(Boolean))].join(', ');
    return `<article class="property-card" data-property-card="${esc(property.id)}"><div class="property-art"><span class="property-type">${esc(prettyKind(property.property_kind))}</span><span class="property-building"></span></div><div class="property-info"><h3>${esc(property.name)}</h3><div class="property-address">${esc(propertyAddress(property))}</div>${parties?`<div class="property-party">${esc(parties)}</div>`:''}<div class="property-summary-grid"><div><small>Monthly payment</small><strong>${hasNonMonthly?'≈ ':''}${money(scheduledMonthly)}</strong></div><div><small>Loan balance</small><strong>${balance?money(balance):active.some(a=>a.account_type!=='rental')?'$0.00':'—'}</strong></div><div><small>Balance due · carries forward</small><strong>${money(amountDue)}</strong></div><button class="button primary compact property-quick-payment" type="button" data-property-payment="${esc(property.id)}">＋ Record payment</button></div></div></article>`;
  }
  function renderOverview() {
    $('stat-properties').textContent = state.properties.filter(p=>!p.archived_at).length; $('stat-accounts').textContent = state.accounts.filter(a => (a.status || 'active') === 'active'&&!state.properties.find(p=>p.id===a.property_id)?.archived_at).length;
    $('stat-collected').textContent = money(collectedSince(monthStart())); $('stat-expected').textContent = money(scheduledMonthlyRunRate());
    const postedThisMonth=state.payments.filter(p=>isPosted(p)&&String(p.received_date)>=monthStart()); $('stat-collected-foot').textContent = `${postedThisMonth.length} payment${postedThisMonth.length === 1 ? '' : 's'} recorded`;
    const upcoming = state.accounts.filter(a => a.status === 'active' && a.next_due_date).sort((a,b) => String(a.next_due_date).localeCompare(String(b.next_due_date))).slice(0,4);
    $('upcoming-list').innerHTML = upcoming.length ? upcoming.map(a => { const p = state.properties.find(x => x.id === a.property_id); return `<div class="list-row"><span class="round-icon">${a.account_type === 'rental' ? '⌂' : '▤'}</span><div class="row-copy"><strong>${esc(a.party_name || a.name)}</strong><small>${esc(p?.name || 'Property')} · ${esc(prettyType(a.account_type))}</small></div><div class="row-right"><strong>${money(a.payment_amount)}</strong><small>Due ${fmtDate(a.next_due_date,{month:'short',day:'numeric'})}</small></div></div>`; }).join('') : '<div class="list-empty">No upcoming payments yet. Add an account to get started.</div>';
    const recent = state.payments.filter(isPosted).slice(0,4);
    $('activity-list').innerHTML = recent.length ? recent.map(p => { const a = state.accounts.find(x => x.id === p.account_id), prop = state.properties.find(x => x.id === a?.property_id); return `<div class="list-row"><span class="round-icon">↙</span><div class="row-copy"><strong>${esc(a?.party_name || a?.name || 'Payment')}</strong><small>${esc(prop?.name || 'Property')} · ${fmtDate(p.received_date,{month:'short',day:'numeric'})}</small></div><div class="row-right"><strong>${money(p.amount)}</strong><small>${esc(p.payment_method.replace('_',' '))}</small></div></div>`; }).join('') : '<div class="list-empty">Recorded payments will appear here.</div>';
    $('overview-properties').innerHTML = state.properties.filter(p=>!p.archived_at).slice(0,3).map(p => propertyCard(p,true)).join('') || '<div class="list-empty">Add your first property to build your portfolio.</div>';
  }
  function renderProperties() {
    const holder=$('property-holder-filter'), current=holder.value;
    holder.innerHTML='<option value="all">All account holders</option>'+state.workspaceMembers.map(m=>`<option value="${esc(m.member_user_id)}">${esc(m.display_name||m.email)}</option>`).join('');
    holder.value=state.workspaceMembers.some(m=>m.member_user_id===current)?current:'all';
    renderAccounts(); $('property-nav-count').textContent = state.properties.filter(p=>!p.archived_at).length;
  }
  function propertyAddressCell(property, street) {
    const note=String(property.notes||'').trim();
    return `<td><button class="table-action property-row-name" data-property-open="${esc(property.id)}">${esc(street)}${property.archived_at?' · Archived':''}</button><button type="button" class="property-row-note${note?' has-note':''}" data-property-note="${esc(property.id)}" aria-label="${esc(note?'Edit':'Add')} quick note for ${esc(street)}" title="${esc(note||'Add a quick note')}">${note?`<em>${esc(note)}</em>`:'<em>＋ Add note</em>'}</button></td>`;
  }
  function renderAccounts() {
    const q = $('property-search').value.trim().toLowerCase(), type = $('property-filter').value, holder = $('property-holder-filter').value, showArchived=$('show-archived').checked, rows=[];
    for(const property of state.properties){
      const tags=state.propertyHolders.filter(x=>x.property_id===property.id).map(x=>x.member_user_id);
      if(property.archived_at&&!showArchived)continue;
      if(holder!=='all'&&!tags.includes(holder))continue;
      const allRelated=state.accounts.filter(a=>a.property_id===property.id), related=allRelated.filter(a=>showArchived||(a.status||'active')==='active'), matches=related.filter(a=>(type==='all'||a.account_type===type)&&(!q||`${property.name} ${propertyAddress(property)} ${property.notes||''} ${a.name} ${a.party_name||''}`.toLowerCase().includes(q)));
      const street=streetAddress(property);
      if(matches.length)for(const account of matches){
        const due=amountDueSince([account],state.payments,unpaidDueAccrualStart(account),todayIso());
        const monthly=monthlyScheduledEstimate([{...account,status:'active'}]);
        const partyName=account.party_name||account.name, fullAddress=propertyAddress(property);
        const reminderHref=lateReminderMailto({email:account.party_email,address:fullAddress,unpaidDue:money(due),senderName:state.user?.user_metadata?.display_name?.trim()||'PropertyDesk'});
        const recipientHint=account.party_email?'Draft late reminder email':'No email saved; opens an unaddressed late reminder draft';
        rows.push(`<tr><td><button type="button" class="button primary compact" data-account-payment="${esc(account.id)}">＋ Payment</button></td><td class="portfolio-due">${money(due)}</td>${propertyAddressCell(property,street)}<td><a class="table-action" href="${esc(reminderHref)}" title="${esc(recipientHint)}" aria-label="${esc(`Draft late reminder email for ${partyName}`)}">${esc(partyName)}</a><small class="table-subtext">${esc(account.name)}${(account.status||'active')!=='active'?' · Inactive':''}</small></td><td>${account.payment_frequency==='monthly'?money(account.payment_amount):`≈ ${money(monthly)}`}<small class="table-subtext">${account.payment_frequency==='monthly'?'Monthly':`${money(account.payment_amount)} / ${paymentFrequencyLabel(account.payment_frequency).toLowerCase()}`}</small></td><td>${account.account_type==='rental'?'—':money(accountBalance(account))}</td></tr>`);
      } else if(allRelated.length===0&&type==='all'&&(!q||`${property.name} ${propertyAddress(property)} ${property.notes||''}`.toLowerCase().includes(q))){
        rows.push(`<tr><td><button type="button" class="button secondary compact" data-property-account="${esc(property.id)}">＋ Add account</button></td><td class="portfolio-due">—</td>${propertyAddressCell(property,street)}<td colspan="2" class="muted">No rental or contract recorded</td><td>—</td></tr>`);
      }
    }
    $('accounts-table').innerHTML=rows.join('');$('accounts-empty').classList.toggle('hidden',rows.length>0);if(!rows.length)$('accounts-empty').textContent='No matching active properties. Use “Show inactive / archived” to include inactive records.';
  }
  function renderPayments() {
    const period=$('payment-period').value,q=$('payment-search').value.trim().toLowerCase(),now=new Date(),type=$('transaction-type').value;
    const rows=[...state.payments.map(item=>({kind:'income',date:item.received_date,amount:Number(item.amount),item})),...state.expenses.map(item=>({kind:'expense',date:item.expense_date,amount:Number(item.amount),item}))]
      .filter(x=>(type==='all'||type===x.kind)&&(period==='all'||(period==='month'&&dateOnly(x.date)?.getMonth()===now.getMonth()&&dateOnly(x.date)?.getFullYear()===now.getFullYear())||(period==='year'&&dateOnly(x.date)?.getFullYear()===now.getFullYear())))
      .filter(x=>{const a=state.accounts.find(z=>z.id===x.item.account_id),p=x.kind==='expense'?state.properties.find(z=>z.id===x.item.property_id):state.properties.find(z=>z.id===a?.property_id);return !q||`${a?.name||''} ${a?.party_name||''} ${p?.name||''} ${x.item.memo||''} ${x.item.payee||''}`.toLowerCase().includes(q);})
      .sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    $('payments-table').innerHTML=rows.map(x=>{const item=x.item,exp=x.kind==='expense',voided=item.status==='voided',a=state.accounts.find(z=>z.id===item.account_id),p=exp?state.properties.find(z=>z.id===item.property_id):state.properties.find(z=>z.id===a?.property_id),correctionOf=exp?item.correction_of_expense_id:item.correction_of_payment_id;return `<tr class="${voided?'transaction-voided':''}"><td>${fmtDate(x.date)}</td><td><span class="${exp?'expense-pill':'status-pill'}">${exp?'Expense':item.income_category==='deposit'?'Security deposit':'Income'}${voided?' · voided':''}</span></td><td><strong>${esc(p?.name||'—')}</strong><br>${esc(a?.party_name||a?.name||'Property')}</td><td>${esc(exp?expenseCategoryLabel(item.category):(a?.account_type==='rental'?item.income_category:'Installment receipt'))}</td><td><strong>${exp?'−':''}${money(x.amount)}</strong></td><td>${esc(exp?(item.payee||item.payment_method):item.payment_method.replace('_',' '))}</td><td>${esc(item.memo||'—')}${item.void_reason?`<small class="table-subtext">${esc(item.void_reason)}</small>`:''}${correctionOf?'<small class="table-subtext">Corrected replacement</small>':''}</td><td>${voided?'<span class="muted">Voided</span>':`<button type="button" class="text-button" data-correct-transaction data-kind="${x.kind}" data-id="${esc(item.id)}">Correct</button> <button type="button" class="text-button" data-void-transaction data-kind="${x.kind}" data-id="${esc(item.id)}">Void</button>`}</td></tr>`;}).join('');
    $('payments-empty').classList.toggle('hidden',rows.length>0);if(!rows.length)$('payments-empty').textContent='No transactions match this view.';
    const monthPayments=state.payments.filter(p=>isPosted(p)&&String(p.received_date)>=monthStart()),monthExpenses=state.expenses.filter(x=>String(x.expense_date)>=monthStart()&&isPosted(x)),income=sumIncome(monthPayments),expenses=sumOperatingExpenses(monthExpenses);
    $('payments-collected').textContent=money(income);$('expenses-total').textContent=money(expenses);$('net-cash-flow').textContent=money(income-expenses);
  }
  function renderReports() {
    const y = new Date().getFullYear(), yearPayments=state.payments.filter(p=>dateOnly(p.received_date)?.getFullYear()===y),income=sumIncome(yearPayments),costs=sumOperatingExpenses(state.expenses.filter(p=>dateOnly(p.expense_date)?.getFullYear()===y));
    $('report-ytd').textContent=money(income); $('report-expenses-ytd').textContent=money(costs); $('report-net-ytd').textContent=money(income-costs);
    $('report-principal').textContent=money(state.accounts.filter(a=>a.account_type!=='rental').reduce((s,a)=>s+accountBalance(a),0));
    const labels=[['rental','Rentals'],['land_contract','Land contracts'],['note','Private notes']]; const counts=labels.map(([k])=>state.accounts.filter(a=>a.account_type===k).length), max=Math.max(1,...counts);
    $('account-breakdown').innerHTML=labels.map(([key,label],i)=>`<div class="breakdown-row"><span>${label}</span><div class="bar-track"><div class="bar-fill" style="width:${counts[i]/max*100}%"></div></div><strong>${counts[i]}</strong></div>`).join('');
    $('import-history').innerHTML=state.importBatches.length?state.importBatches.map(batch=>`<tr><td><strong>${esc(batch.source_name||'CSV import')}</strong></td><td>${esc(batch.source_type)}</td><td>${esc(new Date(batch.created_at).toLocaleString())}</td><td>${Number(batch.rows_accepted)} of ${Number(batch.rows_total)}</td><td><span class="status-pill">${esc(batch.status)}</span></td></tr>`).join(''):'<tr><td colspan="5" class="muted">Completed imports will appear here.</td></tr>';
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
  function resetAccountForm() { $('account-form').reset(); $('account-id').value=''; $('account-start').value=todayIso(); $('account-payment').value='0'; $('account-balance-adjustment').value='0'; $('account-late-fee').value='0'; $('account-grace').value='0'; $('account-modal-title').textContent='Add account'; updateLoanFields(); }
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
    const payload={user_id:state.workspaceOwnerId,property_id:$('account-property').value,account_type:type,name:$('account-name').value.trim(),party_name:$('account-party').value.trim()||null,party_email:partyEmails.join(', ')||null,start_date:$('account-start').value,next_due_date:$('account-next-due').value||null,payment_amount:moneyInput($('account-payment').value),payment_frequency:$('account-frequency').value,original_principal:type==='rental'?0:moneyInput($('account-principal').value),principal_interest_amount:type==='rental'||!$('account-pi-payment').value?null:moneyInput($('account-pi-payment').value),escrow_amount:type==='rental'?0:moneyInput($('account-escrow').value),balance_adjustment:type==='rental'?0:moneyInput($('account-balance-adjustment').value),interest_rate:type==='rental'?0:Number($('account-rate').value||0),term_months:type==='rental'||!$('account-term').value?null:Number($('account-term').value),balloon_date:type==='rental'?null:$('account-balloon').value||null,agreement_effective_date:$('account-effective-date').value||null,agreement_change_reason:$('account-change-reason').value.trim()||null,late_fee:moneyInput($('account-late-fee').value),grace_days:Number($('account-grace').value||0),notes:$('account-notes').value.trim()||null};
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
  async function downloadPropertyDocument(id) {
    const doc=state.documents.find(item=>item.id===id); if(!doc)return;
    const {data,error}=await state.client.storage.from('pd-private-agreements').createSignedUrl(doc.storage_path,60,{download:doc.file_name});
    if(error){toast(`Download failed: ${error.message}`);return;}
    const link=document.createElement('a');link.href=data.signedUrl;link.target='_blank';link.rel='noopener noreferrer';link.download=doc.file_name;link.click();
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
  function openPropertyDetails(id) {
    state.auditRequestId++;
    const property=state.properties.find(x=>x.id===id); if(!property)return; state.selectedPropertyId=id;
    const accounts=state.accounts.filter(a=>a.property_id===id), accountIds=new Set(accounts.map(a=>a.id));
    const income=state.payments.filter(p=>accountIds.has(p.account_id)&&isPosted(p)), accountPayments=state.payments.filter(p=>accountIds.has(p.account_id)), allExpenses=state.expenses.filter(e=>e.property_id===id), expenses=allExpenses.filter(isPosted);
    const incomeTotal=sumIncome(income), expenseTotal=sumOperatingExpenses(expenses);
    const transactions=[
      ...income.map(item=>({date:item.received_date,kind:item.income_category==='deposit'?'Security deposit':'Income',label:accounts.find(a=>a.id===item.account_id)?.name||'Payment',amount:Number(item.amount||0),memo:item.memo,status:item.status})),
      ...accountPayments.filter(p=>!isPosted(p)).map(item=>({date:item.received_date,kind:'Income · voided',label:accounts.find(a=>a.id===item.account_id)?.name||'Payment',amount:Number(item.amount||0),memo:item.memo,status:item.status})),
      ...expenses.map(item=>({date:item.expense_date,kind:'Expense',label:item.payee||item.category||'Expense',amount:-Number(item.amount||0),memo:item.memo,status:item.status})),
      ...allExpenses.filter(e=>!isPosted(e)).map(item=>({date:item.expense_date,kind:'Expense · voided',label:item.payee||item.category||'Expense',amount:-Number(item.amount||0),memo:item.memo,status:item.status}))
    ].sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,8);
    $('property-detail-title').textContent=property.name; $('property-detail-address').textContent=propertyAddress(property);
    $('property-detail-add-income').disabled=!accounts.some(a=>a.status==='active');
    const propertyDocs=state.documents.filter(d=>d.property_id===id);
    $('property-detail-content').innerHTML=`<div class="detail-kpis property-detail-kpis"><div class="detail-kpi"><small>Accounts</small><strong>${accounts.filter(a=>a.status==='active').length} active</strong></div><div class="detail-kpi"><small>Posted income</small><strong>${money(incomeTotal)}</strong></div><div class="detail-kpi"><small>Posted expenses</small><strong>${money(expenseTotal)}</strong></div><div class="detail-kpi"><small>Net cash flow</small><strong>${money(incomeTotal-expenseTotal)}</strong></div></div><div class="detail-section"><h3>Account holders</h3><p class="field-hint">Labels for sorting only. Workspace members can access every property.</p><div class="holder-choices">${state.workspaceMembers.map(m=>`<label><input type="checkbox" data-holder-choice value="${esc(m.member_user_id)}" ${state.propertyHolders.some(h=>h.property_id===id&&h.member_user_id===m.member_user_id)?'checked':''}> ${esc(m.display_name||m.email)}</label>`).join('')}</div><button class="button secondary compact" type="button" data-save-holders>Save labels</button></div><div class="detail-section"><h3>Accounts at this property</h3>${accounts.length?`<div class="table-wrap property-detail-table"><table><thead><tr><th>ACCOUNT</th><th>PARTY</th><th>SCHEDULED PAYMENT</th><th>ESTIMATED LOAN BALANCE</th><th>STATUS</th><th></th></tr></thead><tbody>${accounts.map(a=>`<tr><td><strong>${esc(a.name)}</strong><br><span class="kind-pill">${esc(prettyType(a.account_type))}</span></td><td>${esc(a.party_name||'—')}</td><td>${money(a.payment_amount)} / ${esc(paymentFrequencyLabel(a.payment_frequency).toLowerCase())}</td><td>${a.account_type==='rental'?'—':money(accountBalance(a))}</td><td>${esc(a.status||'active')}</td><td><button class="table-action" data-detail="${esc(a.id)}">Open</button></td></tr>`).join('')}</tbody></table></div>`:'<p class="list-empty">No accounts yet. Add a rental, land contract, or private note.</p>'}</div><div class="detail-section"><h3>Agreements and documents</h3><p class="field-hint">Files are private to your workspace. Select an agreement name to open it, or download a copy. PDFs, DOCX, and JPEG agreements up to 15 MB are supported.</p><label class="button secondary file-button">↑ Upload agreement<input type="file" data-property-document accept="application/pdf,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx,image/jpeg,.jpg,.jpeg"></label><div class="document-list">${propertyDocs.length?propertyDocs.map(doc=>`<div class="document-row"><span>▤</span><div><a class="document-name-link" href="#" data-open-document="${esc(doc.id)}">${esc(doc.file_name)}</a><small>${esc(doc.content_type||'Document')} · ${fmtDate(String(doc.created_at||'').slice(0,10))}</small></div><button type="button" class="button secondary compact" data-download-document="${esc(doc.id)}">↓ Download</button></div>`).join(''):'<p class="list-empty">No agreement files attached yet.</p>'}</div></div><div class="detail-section"><h3>Recent activity</h3>${transactions.length?`<div class="table-wrap property-detail-table"><table><thead><tr><th>DATE</th><th>TYPE</th><th>ACCOUNT / DETAILS</th><th>AMOUNT</th></tr></thead><tbody>${transactions.map(x=>`<tr class="${x.status==='voided'?'transaction-voided':''}"><td>${fmtDate(x.date)}</td><td>${esc(x.kind)}</td><td>${esc(x.label)}${x.memo?`<br><span class="muted">${esc(x.memo)}</span>`:''}</td><td class="${x.amount<0?'negative-amount':''}">${x.amount<0?'−':''}${money(Math.abs(x.amount))}</td></tr>`).join('')}</tbody></table></div>`:'<p class="list-empty">Recorded income and expenses will appear here.</p>'}</div>`;
    $('property-archive-toggle').textContent=property.archived_at?'Restore property':'Archive property';
    openModal('property-detail-modal');
  }
  async function saveProfile(event){event.preventDefault();const display_name=$('display-name').value.trim();if(!display_name){toast('Enter a display name');return;}const {data,error}=await state.client.auth.updateUser({data:{display_name}});if(error){toast(error.message);return;}state.user=data.user||state.user;updateGreeting();toast('Display name saved');}
  async function addWorkspaceMember(event){event.preventDefault();const email=$('member-email').value.trim();if(!email)return;const {error}=await state.client.rpc('pd_add_workspace_member',{p_email:email});if(error){toast(error.message);return;} $('member-email').value='';await fetchAll();renderWorkspaceSettings();toast('Workspace member added');}
  async function removeWorkspaceMember(memberId){const member=state.workspaceMembers.find(x=>x.member_user_id===memberId);if(!member||!confirm(`Remove ${member.display_name||member.email} from this workspace?`))return;const {error}=await state.client.rpc('pd_remove_workspace_member',{p_member_user_id:memberId});if(error){toast(error.message);return;}await fetchAll();renderWorkspaceSettings();toast('Workspace access removed');}
  function renderWorkspaceSettings(){
    $('display-name').value=state.user?.user_metadata?.display_name||'';
    $('workspace-members').innerHTML=state.workspaceMembers.map(m=>`<div class="member-row"><div><strong>${esc(m.display_name||m.email)}</strong><small>${esc(m.email)}${m.is_owner?' · Owner':' · Full workspace access'}</small></div>${m.is_owner?'<span class="kind-pill">Owner</span>':`<button class="text-button" type="button" data-remove-member="${esc(m.member_user_id)}">Remove</button>`}</div>`).join('');
    $('member-add-form').classList.toggle('hidden',state.workspaceOwnerId!==state.user?.id);
  }
  async function savePropertyHolders(){const id=state.selectedPropertyId,selected=[...document.querySelectorAll('[data-holder-choice]:checked')].map(x=>x.value);if(!id)return;const {error:delError}=await state.client.from('pd_property_holders').delete().eq('user_id',state.workspaceOwnerId).eq('property_id',id);if(delError){toast(delError.message);return;}if(selected.length){const {error}=await state.client.from('pd_property_holders').insert(selected.map(member_user_id=>({user_id:state.workspaceOwnerId,property_id:id,member_user_id})));if(error){toast(error.message);await fetchAll();openPropertyDetails(id);return;}}await fetchAll();openPropertyDetails(id);toast('Account-holder labels saved');}
  async function toggleArchiveProperty(){const id=state.selectedPropertyId,p=state.properties.find(x=>x.id===id);if(!p)return;const archived_at=p.archived_at?null:todayIso();const {error}=await state.client.from('pd_properties').update({archived_at}).eq('id',id).eq('user_id',state.workspaceOwnerId);if(error){toast(error.message);return;}await fetchAll();openPropertyDetails(id);toast(archived_at?'Property archived':'Property restored');}
  function depositSectionHTML(account){
    if(account.account_type!=='rental')return '';
    const {entries,active,totals}=depositLedger(account.id),activeIds=new Set(active.map(row=>row.id));
    const label={received:'Received',refunded:'Refunded',retained:'Retained',restored:'Retention reversed'};
    const rows=entries.map(entry=>{
      const payment=entry.source_payment_id&&state.payments.find(row=>row.id===entry.source_payment_id),expense=entry.source_expense_id&&state.expenses.find(row=>row.id===entry.source_expense_id),reason=entry.reason||payment?.memo||expense?.memo||'';
      return `<tr class="${activeIds.has(entry.id)?'':'transaction-voided'}"><td>${fmtDate(entry.movement_date)}</td><td>${esc(label[entry.entry_type]||entry.entry_type)}</td><td>${money(entry.amount)}</td><td>${esc(reason||'—')}${activeIds.has(entry.id)?'':'<small class="table-subtext">Source transaction voided · excluded from held balance</small>'}</td></tr>`;
    }).join('');
    return `<div class="detail-section"><h3>Security deposit ledger</h3><div class="detail-kpis"><div class="detail-kpi"><small>Held balance</small><strong>${money(totals.held)}</strong></div><div class="detail-kpi"><small>Received</small><strong>${money(totals.received)}</strong></div><div class="detail-kpi"><small>Refunded</small><strong>${money(totals.refunded)}</strong></div><div class="detail-kpi"><small>Retained</small><strong>${money(totals.retained-totals.restored)}</strong></div></div><p class="field-hint">Deposit funds are tracked separately from rent and operating expenses. Retention is a liability adjustment; review its tax treatment separately.</p><div class="portfolio-row-actions"><button type="button" class="button secondary compact" data-deposit-adjustment="retained" data-account-id="${esc(account.id)}">Record amount retained</button>${totals.retained>totals.restored?`<button type="button" class="button secondary compact" data-deposit-adjustment="restored" data-account-id="${esc(account.id)}">Reverse retention</button>`:''}</div>${rows?`<div class="table-wrap property-detail-table"><table><thead><tr><th>DATE</th><th>MOVEMENT</th><th>AMOUNT</th><th>REASON / STATUS</th></tr></thead><tbody>${rows}</tbody></table></div>`:'<p class="list-empty">Security deposit receipts, refunds, and adjustments will appear here.</p>'}</div>`;
  }
  async function recordDepositAdjustment(accountId,type){
    const account=state.accounts.find(row=>row.id===accountId);if(!account||account.account_type!=='rental')return;
    const action=type==='retained'?'retained from the deposit':'restored to the held balance';
    const amount=moneyInput(prompt(`Amount ${action}?`,'0.00'));if(amount<=0){toast('Enter an amount greater than zero');return;}
    const reason=prompt('Add a reason for the deposit ledger:');if(reason===null)return;if(!reason.trim()){toast('Enter a reason so this adjustment can be audited');return;}
    const {error}=await state.client.from('pd_deposit_entries').insert({user_id:state.workspaceOwnerId,account_id:accountId,entry_type:type,amount,movement_date:todayIso(),reason:reason.trim()});
    if(error){toast(`Deposit adjustment failed: ${error.message}`);return;}
    await fetchAll();await openAccountDetails(accountId);toast(type==='retained'?'Deposit retention recorded':'Deposit retention reversed');
  }
  async function openAccountDetails(id) {
    const auditRequestId=++state.auditRequestId;
    const a=state.accounts.find(x=>x.id===id); if(!a)return; const p=state.properties.find(x=>x.id===a.property_id); const payments=state.payments.filter(x=>x.account_id===id); const schedule=a.account_type==='rental'?[]:scheduleFor(a);
    const auditIds=[a.id,...payments.slice(0,50).map(payment=>payment.id)];
    let history=[],auditError=false;
    try { const result=await state.client.from('pd_audit_events').select('id,entity_type,entity_id,action,created_at').in('entity_id',auditIds).order('created_at',{ascending:false}).limit(100);history=result.data||[];auditError=Boolean(result.error); } catch { auditError=true; }
    if(auditRequestId!==state.auditRequestId)return;
    $('detail-title').textContent=a.name; const scheduleHTML=schedule.length?`<div class="detail-section"><h3>Estimated amortization schedule</h3><div class="schedule-table"><table><thead><tr><th># / Due</th><th>Payment</th><th>Principal</th><th>Interest</th><th>Balance</th></tr></thead><tbody>${schedule.map(s=>`<tr><td>${s.i} · ${fmtDate(s.date,{month:'short',year:'2-digit'})}</td><td>${money(s.payment)}</td><td>${money(s.principal)}</td><td>${money(s.interest)}</td><td>${money(s.balance)}</td></tr>`).join('')}</tbody></table></div><p class="field-hint">Estimate uses explicit P&I when set; otherwise it derives P&I from principal, rate and term. Taxes/insurance escrow is excluded. The on-time estimate follows this schedule through the selected date regardless of receipts recorded. The owner adjustment changes the displayed balance without rewriting historical schedule rows.</p></div>`:'';
    const accountVersions=state.agreementVersions.filter(v=>v.account_id===a.id);
    const versionsHTML=`<div class="detail-section"><h3>Prior agreement terms</h3>${accountVersions.length?`<div class="audit-list">${accountVersions.map(v=>{const t=v.terms||{};return `<div class="audit-row"><div><strong>${esc(v.reason||'Terms updated')}</strong><small>${fmtDate(v.effective_from)} – ${fmtDate(v.replaced_on)} · ${money(t.payment_amount)} scheduled · ${money(t.original_principal)} principal · ${Number(t.interest_rate||0)}% · ${Number(t.term_months||0)} months</small>${t.party_name?`<small>${esc(t.party_name)}</small>`:''}</div><time datetime="${esc(v.created_at)}">${fmtDate(String(v.created_at||'').slice(0,10))}</time></div>`;}).join('')}</div>`:'<p class="list-empty">Amendments and prior terms will appear here when recorded.</p>'}</div>`;
    const auditHTML=`<div class="detail-section"><h3>Change history</h3><p class="field-hint">Latest account and payment events. Original entries remain available after a void.</p>${history.length?`<div class="audit-list">${history.map(event=>{const target=event.entity_type==='pd_accounts'?'Account':'Payment',action=event.action==='created'?'Created':event.action==='updated'?'Updated':event.action==='voided'?'Voided':event.action==='deleted'?'Deleted':'Recorded',reason=event.action==='voided'?state.payments.find(payment=>payment.id===event.entity_id)?.void_reason:'';return `<div class="audit-row"><div><strong>${action} ${target.toLowerCase()}</strong>${reason?`<small>Reason: ${esc(reason)}</small>`:''}</div><time datetime="${esc(event.created_at)}">${esc(new Date(event.created_at).toLocaleString())}</time></div>`;}).join('')}</div>`:auditError?'<p class="list-empty">Change history is temporarily unavailable.</p>':'<p class="list-empty">No changes recorded yet.</p>'}</div>`;
    const postedPayments=payments.filter(isPosted);
    $('detail-content').innerHTML=`<div class="detail-kpis"><div class="detail-kpi"><small>Property</small><strong>${esc(p?.name||'—')}</strong></div><div class="detail-kpi"><small>Regular payment</small><strong>${money(a.payment_amount)}</strong></div><div class="detail-kpi"><small>${a.account_type==='rental'?'Collected to date':'Estimated loan balance · on-time schedule'}</small><strong>${a.account_type==='rental'?money(postedPayments.reduce((s,x)=>s+Number(x.amount),0)):money(accountBalance(a))}</strong></div></div><div class="detail-section"><h3>${esc(prettyType(a.account_type))} · ${esc(a.party_name||'No party recorded')}</h3><div class="list-row"><div class="row-copy"><strong>${esc(propertyAddress(p||{}))}</strong><small>Next due ${fmtDate(a.next_due_date)} · ${esc(paymentFrequencyLabel(a.payment_frequency))} · unpaid due tracked since ${fmtDate(unpaidDueAccrualStart(a),{month:'short',day:'numeric',year:'numeric'})}: ${money(amountDueSince([a],state.payments,unpaidDueAccrualStart(a),todayIso()))}</small></div><button id="detail-edit" class="button secondary compact">Edit</button><button id="detail-record" class="button primary compact">Record payment</button></div></div>${depositSectionHTML(a)}${scheduleHTML}${versionsHTML}<div class="detail-section"><h3>Payment history (${payments.length})</h3>${payments.length?`<div class="schedule-table"><table><thead><tr><th>Date</th><th>Amount received</th><th>Status</th><th>Memo</th></tr></thead><tbody>${payments.map(x=>`<tr class="${x.status==='voided'?'transaction-voided':''}"><td>${fmtDate(x.received_date)}</td><td>${money(x.amount)}</td><td>${x.status==='voided'?'Voided':'Posted'}</td><td>${esc(x.memo||'—')}</td></tr>`).join('')}</tbody></table></div>`:'<div class="list-empty">No payments recorded for this account.</div>'}</div>${auditHTML}<div class="detail-section"><button id="detail-delete" class="text-button">Close account and preserve its history</button></div>`;
    $('detail-edit').addEventListener('click',()=>{closeModal($('detail-modal'));editAccount(a);}); $('detail-record').addEventListener('click',()=>{closeModal($('detail-modal'));openPayment(a.id);}); $('detail-delete').addEventListener('click',()=>deleteAccount(a)); openModal('detail-modal');
  }
  async function deleteAccount(a) { if(!confirm(`Close “${a.name}”? Its payment history will remain in your records.`))return; const {error}=await state.client.from('pd_accounts').update({status:'closed'}).eq('id',a.id);if(error){toast(error.message);return;}closeModal($('detail-modal'));await fetchAll();toast('Account closed'); }
  async function voidTransaction(kind,id) { const table=kind==='income'?'pd_payments':'pd_expenses';if(!confirm(`Void this ${kind==='income'?'income entry':'expense'}? It will remain in the audit history but stop affecting balances and reports.`))return;const reason=prompt('Optional reason for the audit record:','Entered in error');if(reason===null)return;const {data,error}=await state.client.from(table).update({status:'voided',voided_at:new Date().toISOString(),void_reason:reason.trim()||'Voided by owner'}).eq('id',id).eq('status','posted').select('id').maybeSingle();if(error){toast(error.message);return;}if(!data){toast('This transaction was already voided or is no longer available.');return;}await fetchAll();toast('Transaction voided; original entry preserved'); }
  function editAccount(a) {
    resetAccountForm(); populateFormOptions(); $('account-modal-title').textContent='Edit account'; $('account-id').value=a.id; $('account-type').value=a.account_type; updateLoanFields(); $('account-property').value=a.property_id; $('account-name').value=a.name; $('account-party').value=a.party_name||''; $('account-party-email').value=a.party_email||''; $('account-start').value=a.start_date; $('account-next-due').value=a.next_due_date||''; $('account-payment').value=a.payment_amount; $('account-frequency').value=a.payment_frequency; $('account-principal').value=a.original_principal; $('account-pi-payment').value=a.principal_interest_amount||''; $('account-escrow').value=a.escrow_amount||'0'; $('account-balance-adjustment').value=a.balance_adjustment||'0'; $('account-effective-date').value=a.agreement_effective_date||''; $('account-change-reason').value=''; $('account-rate').value=a.interest_rate; $('account-term').value=a.term_months||''; $('account-balloon').value=a.balloon_date||''; $('account-late-fee').value=a.late_fee; $('account-grace').value=a.grace_days; $('account-notes').value=a.notes||''; openModal('account-modal');
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

  function stageImport(title, rows, commit, note='', report={}) {
    const total=Number(report.total??rows.length), errors=report.errors||[];
    if(total>500)throw new Error('Imports are limited to 500 rows at a time. Split the CSV and review each batch.');
    if(!rows.length&&!errors.length)throw new Error('The CSV file has no importable rows.');
    state.pendingImport={title,rows,commit,errors,total,note,rawRows:report.rawRows||[],correctionKeys:report.correctionKeys||[],revalidate:report.revalidate||null};
    $('import-include-duplicates').checked=false;
    renderImportPreview();
    openModal('import-preview-modal');
  }
  function renderImportPreview(){
    const pending=state.pendingImport;if(!pending)return;
    const {rows,errors,total,note}=pending,duplicateCount=rows.filter(row=>row._possible_duplicate).length;
    $('import-preview-title').textContent=pending.title;
    $('import-preview-summary').textContent=`${total} CSV row${total===1?'':'s'} · ${rows.length} valid${errors.length?` · ${errors.length} need correction`:''}${duplicateCount?` · ${duplicateCount} possible duplicate${duplicateCount===1?'':'s'} excluded by default`:''}${note?` · ${note}`:''}`;
    $('import-include-duplicates-wrap').classList.toggle('hidden',duplicateCount===0);
    const keys=[...new Set(rows.flatMap(row=>Object.keys(row).filter(key=>!['_possible_duplicate','_source_row'].includes(key))))];
    if(duplicateCount||errors.length)keys.unshift('source_row');
    if(duplicateCount)keys.push('review_status');
    $('import-preview-head').innerHTML=keys.length?`<tr>${keys.map(key=>`<th>${esc(key.replaceAll('_',' '))}</th>`).join('')}</tr>`:'';
    $('import-preview-body').innerHTML=rows.map(row=>`<tr class="${row._possible_duplicate?'duplicate-import-row':''}">${keys.map(key=>`<td>${esc(key==='review_status'?(row._possible_duplicate?'Possible duplicate — skipped':'New row'):key==='source_row'?row._source_row:(row[key]??''))}</td>`).join('')}</tr>`).join('');
    $('import-preview-errors').classList.toggle('hidden',errors.length===0);
    $('import-preview-error-summary').textContent=errors.length?'Correct the editable cells below; corrected rows are revalidated immediately and become eligible for import. Rows with malformed CSV structure must be fixed in the source file.':'';
    const rawKeys=[...new Set([...pending.correctionKeys,...pending.rawRows.flatMap(row=>Object.keys(row))])];
    $('import-correction-head').innerHTML=rawKeys.length?`<tr><th>CSV ROW</th>${rawKeys.map(key=>`<th>${esc(key.replaceAll('_',' '))}</th>`).join('')}<th>VALIDATION</th></tr>`:'';
    $('import-correction-body').innerHTML=errors.map(error=>{
      const raw=pending.rawRows.find(row=>Number(row._source_row)===Number(error.row));
      const cells=rawKeys.map(key=>`<td>${raw&&!raw._parse_error?`<input type="text" data-import-correction data-row="${Number(error.row)}" data-column="${esc(key)}" aria-label="CSV row ${Number(error.row)} ${esc(key)}" value="${esc(raw[key]??'')}">`:esc(raw?.[key]??'')}</td>`).join('');
      return `<tr><td>${Number(error.row)}</td>${cells}<td>${esc(error.message)}</td></tr>`;
    }).join('');
    $('import-correction-table').classList.toggle('hidden',errors.length===0||rawKeys.length===0);
    updateImportCommitButton();
  }
  function updateImportCommitButton(){const pending=state.pendingImport,selected=selectImportRows(pending?.rows||[],$('import-include-duplicates').checked),count=selected.length;$('import-commit').textContent=count?`Import ${count} row${count===1?'':'s'}`:'No valid rows to import';$('import-commit').disabled=count===0;}
  async function importAccounts(file) {
    const status=$('import-status');status.textContent='';status.classList.remove('success');
    try {
      const rows=parseCSV(await file.text());
      if(!rows.length)throw new Error('The CSV file has no account rows.');
      const validateRows=sourceRows=>validateAccountRows(sourceRows,state.properties,state.accounts,todayIso());
      const validation=validateRows(rows);
      const staged=validation.valid;
      stageImport('Review account import',staged,async(rowsToImport,review)=>{
        const payload=rowsToImport.map(row=>({property_name:row.property_name,property_address:row.property_address,city:row.city,state:row.state,postal_code:row.postal_code,property_kind:row.property_kind,account_type:row.account_type,account_name:row.account_name,party_name:row.party_name||null,party_email:row.party_email||null,start_date:row.start_date,next_due_date:row.next_due_date||null,payment_amount:row.payment_amount,payment_frequency:row.payment_frequency,original_principal:row.original_principal,principal_interest_amount:row.principal_interest_amount,escrow_amount:row.escrow_amount,ledger_opening_balance:row.ledger_opening_balance,ledger_opening_date:row.ledger_opening_date||null,interest_rate:row.interest_rate,term_months:row.term_months?Number(row.term_months):null,balloon_date:row.balloon_date||null,late_fee:row.late_fee,grace_days:row.grace_days,notes:row.notes||null}));
        const {data,error}=await state.client.rpc('pd_import_propertydesk_accounts',{p_rows:payload,p_source_name:file.name,p_rows_total:review.total});
        if(error)throw error;
        await fetchAll();
        const imported=Number(data?.rows_accepted)||payload.length,rejected=review.total-imported;
        status.textContent=`Imported ${imported} account${imported===1?'':'s'}; ${rejected} row${rejected===1?' was':'s were'} skipped or need correction. Source saved to import history.`;
        status.classList.add('success');toast('Import complete');
      },'',{total:validation.total,errors:validation.errors,rawRows:rows,correctionKeys:['property_name','property_address','city','state','postal_code','property_kind','account_type','account_name','party_name','party_email','start_date','next_due_date','payment_amount','payment_frequency','original_principal','principal_interest_amount','escrow_amount','ledger_opening_balance','ledger_opening_date','interest_rate','term_months','balloon_date','late_fee','grace_days','notes'],revalidate:validateRows});
    }catch(error){status.textContent=`Import failed: ${error.message}`;}
    $('import-file').value='';
  }

  async function importExpenses(file) {
    const status=$('import-status');status.textContent='';status.classList.remove('success');
    try {
      const rows=parseCSV(await file.text());
      if(!rows.length)throw new Error('The CSV file has no expense rows.');
      const validateRows=sourceRows=>validateExpenseRows(sourceRows,state.properties,state.accounts,state.expenses);
      const validation=validateRows(rows);
      stageImport('Review expense import',validation.valid,async(rowsToImport,review)=>{
        const payload=rowsToImport.map(row=>{const p=state.properties.find(x=>x.name===row.property_name&&x.address===row.property_address),a=row.account_name?state.accounts.find(x=>x.property_id===p.id&&x.name===row.account_name):null;return {property_id:p.id,account_id:a?.id||null,expense_date:row.expense_date,amount:row.amount,category:row.category,payee:row.payee||null,payment_method:row.payment_method,memo:row.memo||null};});
        const {data,error}=await state.client.rpc('pd_import_propertydesk_transactions',{p_kind:'expenses',p_rows:payload,p_source_name:file.name,p_rows_total:review.total});
        if(error)throw error;
        await fetchAll();
        const imported=Number(data?.rows_accepted)||payload.length,rejected=review.total-imported;
        status.textContent=`Imported ${imported} expense${imported===1?'':'s'}; ${rejected} row${rejected===1?' was':'s were'} skipped or need correction. Source saved to import history.`;
        status.classList.add('success');toast('Expense import complete');
      },'',{total:validation.total,errors:validation.errors,rawRows:rows,correctionKeys:['property_name','property_address','account_name','expense_date','amount','category','payee','payment_method','memo','source_note'],revalidate:validateRows});
    }catch(error){status.textContent=`Import needs review: ${error.message}`;}
    $('expense-import-file').value='';
  }

  async function importPayments(file) {
    const status=$('import-status');status.textContent='';status.classList.remove('success');
    try {
      const rows=parseCSV(await file.text());
      if(!rows.length)throw new Error('The CSV file has no payment rows.');
      const validateRows=sourceRows=>validatePaymentRows(sourceRows,state.properties,state.accounts,state.payments);
      const validation=validateRows(rows);
      stageImport('Review payment import',validation.valid,async(rowsToImport,review)=>{
        const rowsToInsert=rowsToImport.map(row=>({account_id:state.accounts.find(a=>a.name===row.account_name&&state.properties.find(p=>p.id===a.property_id)?.name===row.property_name&&state.properties.find(p=>p.id===a.property_id)?.address===row.property_address).id,received_date:row.received_date,amount:row.amount,income_category:row.income_category,payment_method:row.payment_method,principal_amount:row.principal_amount,interest_amount:row.interest_amount,fee_amount:row.fee_amount,escrow_amount:row.escrow_amount,unapplied_amount:row.unapplied_amount,memo:row.memo||null}));
        const {data,error}=await state.client.rpc('pd_import_propertydesk_transactions',{p_kind:'payments',p_rows:rowsToInsert,p_source_name:file.name,p_rows_total:review.total});
        if(error)throw error;
        await fetchAll();
        const imported=Number(data?.rows_accepted)||rowsToInsert.length,rejected=review.total-imported;
        status.textContent=`Imported ${imported} payment${imported===1?'':'s'}; ${rejected} row${rejected===1?' was':'s were'} skipped or need correction. Source saved to import history.`;
        status.classList.add('success');toast('Payment import complete');
      },'',{total:validation.total,errors:validation.errors,rawRows:rows,correctionKeys:['property_name','property_address','account_name','received_date','amount','income_category','payment_method','principal_amount','interest_amount','fee_amount','escrow_amount','unapplied_amount','memo'],revalidate:validateRows});
    }catch(error){status.textContent=`Payment import needs review: ${error.message}`;}
    $('payment-import-file').value='';
  }  function csvCell(v){const s=String(v??'');return /[",\r\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;}
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
    document.querySelectorAll('.nav-link').forEach(x=>x.addEventListener('click',()=>{if(x.dataset.view==='workspace')renderWorkspaceSettings();navigate(x.dataset.view);}));
    document.querySelectorAll('[data-goto]').forEach(x=>x.addEventListener('click',()=>navigate(x.dataset.goto)));
    document.querySelectorAll('[data-open="property-modal"]').forEach(x=>x.addEventListener('click',()=>{resetPropertyForm();openModal('property-modal');}));
    document.querySelectorAll('[data-open="account-modal"]').forEach(x=>x.addEventListener('click',()=>{if(!state.properties.length){toast('Add a property before creating an account');navigate('properties');return;}resetAccountForm();populateFormOptions();openModal('account-modal');}));
    document.querySelectorAll('[data-open="payment-modal"]').forEach(x=>x.addEventListener('click',()=>{if(!state.accounts.length){toast('Add an account before recording a payment');navigate('properties');return;}openPayment();}));
    $('quick-payment').addEventListener('click',()=>{if(!state.accounts.length){toast('Add an account before recording a payment');navigate('properties');return;}openPayment();});
    document.querySelectorAll('[data-close]').forEach(x=>x.addEventListener('click',()=>closeModal(x.closest('.modal'))));
    $('property-form').addEventListener('submit',saveProperty); $('account-form').addEventListener('submit',saveAccount); $('payment-form').addEventListener('submit',savePayment); $('expense-form').addEventListener('submit',saveExpense);
    $('account-type').addEventListener('change',updateLoanFields); $('payment-account').addEventListener('change',updateAllocationPreview); $('payment-amount').addEventListener('input',updateAllocationPreview); $('payment-date').addEventListener('change',updateAllocationPreview);
    $('expense-property').addEventListener('change',()=>{const pid=$('expense-property').value,related=state.accounts.filter(a=>a.property_id===pid);fillSelect('expense-account',related.map(a=>({value:a.id,label:`${a.name} — ${prettyType(a.account_type)}`})),'Property level');});
    $('expense-category').addEventListener('change',()=>{$('deposit-refund-hint').classList.toggle('hidden',$('expense-category').value!=='deposit_refund');});
    $('property-search').addEventListener('input',renderProperties); $('property-filter').addEventListener('change',renderProperties); $('property-holder-filter').addEventListener('change',renderProperties); $('show-archived').addEventListener('change',renderProperties); $('payment-search').addEventListener('input',renderPayments); $('payment-period').addEventListener('change',renderPayments); $('transaction-type').addEventListener('change',renderPayments);
    document.addEventListener('click',e=>{const depositAdjustment=e.target.closest('[data-deposit-adjustment]');if(depositAdjustment){recordDepositAdjustment(depositAdjustment.dataset.accountId,depositAdjustment.dataset.depositAdjustment);return;}const removeMember=e.target.closest('[data-remove-member]');if(removeMember){removeWorkspaceMember(removeMember.dataset.removeMember);return;}if(e.target.closest('[data-save-holders]')){savePropertyHolders();return;}const accountPayment=e.target.closest('[data-account-payment]');if(accountPayment){e.preventDefault();e.stopPropagation();openPayment(accountPayment.dataset.accountPayment);return;}const propertyAccount=e.target.closest('[data-property-account]');if(propertyAccount){resetAccountForm();populateFormOptions();$('account-property').value=propertyAccount.dataset.propertyAccount;openModal('account-modal');return;}const propertyNote=e.target.closest('[data-property-note]');if(propertyNote){e.preventDefault();e.stopPropagation();editPropertyQuickNote(propertyNote.dataset.propertyNote);return;}const propertyOpen=e.target.closest('[data-property-open]');if(propertyOpen){openPropertyDetails(propertyOpen.dataset.propertyOpen);return;}const quickPayment=e.target.closest('[data-property-payment]');if(quickPayment){e.preventDefault();e.stopPropagation();openPropertyPayment(quickPayment.dataset.propertyPayment);return;}const openDoc=e.target.closest('[data-open-document]');if(openDoc){e.preventDefault();openPropertyDocument(openDoc.dataset.openDocument);return;}const download=e.target.closest('[data-download-document]');if(download){downloadPropertyDocument(download.dataset.downloadDocument);return;}const correction=e.target.closest('[data-correct-transaction]');if(correction){correctTransaction(correction.dataset.kind,correction.dataset.id);return;}const voidButton=e.target.closest('[data-void-transaction]');if(voidButton){voidTransaction(voidButton.dataset.kind,voidButton.dataset.id);return;}const a=e.target.closest('[data-detail]');if(a){closeModal($('property-detail-modal'));openAccountDetails(a.dataset.detail);return;}const card=e.target.closest('[data-property-card]');if(card){openPropertyDetails(card.dataset.propertyCard);return;}});
    document.addEventListener('change',e=>{if(e.target.matches('[data-property-document]'))uploadPropertyDocument(e.target);});
    $('property-detail-add-income').addEventListener('click',()=>{const propertyId=state.selectedPropertyId;if(!propertyId)return;closeModal($('property-detail-modal'));openPayment(null,propertyId);});
    $('property-detail-add-expense').addEventListener('click',()=>{const propertyId=state.selectedPropertyId;if(!propertyId)return;closeModal($('property-detail-modal'));openExpense(propertyId);});
    $('property-detail-add-account').addEventListener('click',()=>{const propertyId=state.selectedPropertyId;if(!propertyId)return;closeModal($('property-detail-modal'));resetAccountForm();populateFormOptions();$('account-property').value=propertyId;openModal('account-modal');});
    $('display-name-form').addEventListener('submit',saveProfile);$('member-add-form').addEventListener('submit',addWorkspaceMember);$('user-menu').addEventListener('click',()=>{renderWorkspaceSettings();navigate('workspace');});$('property-archive-toggle').addEventListener('click',toggleArchiveProperty);
    $('sign-out').addEventListener('click',async()=>{await state.client.auth.signOut();state.user=null;state.properties=[];state.accounts=[];state.payments=[];showAuth();setAuthMode(false);}); $('auth-toggle').addEventListener('click',()=>setAuthMode($('auth-form').dataset.mode!=='signup')); $('auth-form').addEventListener('submit',submitAuth); $('forgot-password').addEventListener('click',requestPasswordReset); $('password-reset-form').addEventListener('submit',submitPasswordReset); $('reset-password-cancel').addEventListener('click',()=>{state.passwordRecoveryInProgress=false;setAuthMode(false);showAuth();});
    document.querySelectorAll('[data-open="expense-modal"]').forEach(x=>x.addEventListener('click',()=>{if(!state.properties.length){toast('Add a property before recording an expense');navigate('properties');return;}openExpense();}));
    $('import-correction-body').addEventListener('change',event=>{const input=event.target.closest('[data-import-correction]'),pending=state.pendingImport;if(!input||!pending?.revalidate)return;const row=pending.rawRows.find(item=>Number(item._source_row)===Number(input.dataset.row));if(!row)return;Object.defineProperty(row,input.dataset.column,{value:input.value,enumerable:true,writable:true,configurable:true});const reviewed=pending.revalidate(pending.rawRows);pending.rows=reviewed.valid;pending.errors=reviewed.errors;pending.total=reviewed.total;$('import-include-duplicates').checked=false;renderImportPreview();});
    $('import-include-duplicates').addEventListener('change',updateImportCommitButton);
    $('import-commit').addEventListener('click',async()=>{const pending=state.pendingImport;if(!pending)return;const selected=selectImportRows(pending.rows,$('import-include-duplicates').checked);if(!selected.length){toast('No new rows to import.');return;}$('import-commit').disabled=true;$('import-commit').textContent='Importing…';try{await pending.commit(selected,pending);state.pendingImport=null;closeModal($('import-preview-modal'));}catch(error){$('import-preview-summary').textContent=`Import failed; no rows were committed. ${error.message}`;updateImportCommitButton();}finally{$('import-commit').disabled=false;}});
    $('import-file').addEventListener('change',e=>{if(e.target.files[0])importAccounts(e.target.files[0]);}); $('payment-import-file').addEventListener('change',e=>{if(e.target.files[0])importPayments(e.target.files[0]);}); $('expense-import-file').addEventListener('change',e=>{if(e.target.files[0])importExpenses(e.target.files[0]);}); $('export-all').addEventListener('click',exportAll); $('export-report').addEventListener('click',exportReport);
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
