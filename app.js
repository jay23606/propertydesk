/* PropertyDesk: static client backed by Supabase Auth, Postgres and RLS. */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const { csvMoney, parseCSV, validIsoDate } = window.PropertyDeskImportUtils;
  const { isPosted, principalBalance, sumPosted } = window.PropertyDeskLedgerUtils;
  const config = window.PROPERTYDESK_CONFIG || {};
  const configured = Boolean(config.supabaseUrl && config.supabaseAnonKey && window.supabase);
  const state = { client: null, user: null, view: 'overview', properties: [], accounts: [], payments: [], expenses: [], pendingImport: null, editingProperty: null, editingAccount: null, toastTimer: null };
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

  function toast(message) {
    const el = $('toast'); el.textContent = message; el.classList.add('show');
    clearTimeout(state.toastTimer); state.toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
  }
  function moneyInput(value) { const raw=String(value??'').trim(),negative=/^\(.*\)$/.test(raw),normalized=raw.replace(/[,$\s()]/g,'');const n=Number(normalized)*(negative?-1:1);return Number.isFinite(n)?Math.round((n+Number.EPSILON)*100)/100:0; }
  function accountBalance(account) {
    return principalBalance(account.original_principal, state.payments.filter(p => p.account_id === account.id));
  }
  function interestDue(account, onDate = new Date()) {
    const rate = Number(account.interest_rate || 0) / 100;
    if (!rate || !account.original_principal) return 0;
    const relevant = state.payments.filter(p => p.account_id === account.id && (p.status || 'posted') === 'posted' && dateOnly(p.received_date) <= onDate)
      .sort((a,b) => String(a.received_date).localeCompare(String(b.received_date)));
    let balance = Number(account.original_principal), last = dateOnly(account.start_date) || onDate, accrued = 0;
    for (const payment of relevant) {
      const pd = dateOnly(payment.received_date);
      if (!pd) continue;
      const days = Math.max(0, Math.round((pd - last) / 86400000));
      accrued += balance * rate * days / 365;
      balance = Math.max(0, balance - Number(payment.principal_amount || 0));
      accrued = Math.max(0, accrued - Number(payment.interest_amount || 0));
      last = pd;
    }
    const days = Math.max(0, Math.round((onDate - last) / 86400000));
    return moneyInput(accrued + balance * rate * days / 365);
  }
  function suggestedAllocation(account, amount, date) {
    amount = Math.max(0, moneyInput(amount));
    const feeDue = 0;
    if (account.account_type === 'rental') return { principal: 0, interest: 0, fee: 0, unapplied: amount };
    const interest = Math.min(amount, interestDue(account, dateOnly(date) || new Date()));
    const principal = Math.min(Math.max(0, amount - interest), accountBalance(account));
    return { principal: moneyInput(principal), interest: moneyInput(interest), fee: feeDue, unapplied: moneyInput(Math.max(0, amount - interest - principal - feeDue)) };
  }
  function paymentFrequencyLabel(f) { return ({ monthly: 'Monthly', weekly: 'Weekly', biweekly: 'Every 2 weeks', quarterly: 'Quarterly', annual: 'Annually' }[f] || 'Monthly'); }
  function expectedThisMonth() {
    const now = new Date(); const month = now.getMonth(), year = now.getFullYear();
    return state.accounts.filter(a => a.status === 'active' && a.next_due_date && (dateOnly(a.next_due_date).getMonth() === month && dateOnly(a.next_due_date).getFullYear() === year)).reduce((s,a) => s + Number(a.payment_amount || 0), 0);
  }
  function collectedSince(date) { return sumPosted(state.payments.filter(p => String(p.received_date) >= date)); }

  async function fetchAll() {
    const [pr, ar, pay, exp] = await Promise.all([
      state.client.from('pd_properties').select('*').order('created_at', { ascending: false }),
      state.client.from('pd_accounts').select('*').order('created_at', { ascending: false }),
      state.client.from('pd_payments').select('*').order('received_date', { ascending: false }).order('recorded_at', { ascending: false }),
      state.client.from('pd_expenses').select('*').order('expense_date', { ascending: false }).order('recorded_at', { ascending: false })
    ]);
    const error = pr.error || ar.error || pay.error || exp.error;
    if (error) { toast(error.message); throw error; }
    state.properties = pr.data || []; state.accounts = ar.data || []; state.payments = pay.data || []; state.expenses = exp.data || [];
    render();
  }
  function showAuth() { $('auth-view').classList.remove('hidden'); $('app-view').classList.add('hidden'); }
  function showApp() { $('auth-view').classList.add('hidden'); $('app-view').classList.remove('hidden'); }
  function showConfigError() {
    const banner = $('config-banner'); banner.innerHTML = 'Supabase is not configured. Copy <code>config.example.js</code> to <code>config.js</code>, add your project URL and anon key, then reload.'; banner.classList.remove('hidden');
    $('auth-title').textContent = 'Connect your workspace'; document.querySelector('.auth-intro').textContent = 'Add your Supabase project settings to start your private PropertyDesk workspace.';
    $('auth-form').classList.add('hidden'); $('auth-toggle').classList.add('hidden'); document.querySelector('.privacy-note').classList.add('hidden'); showAuth();
  }
  function updateGreeting() {
    const hour = new Date().getHours(); const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    $('greeting-name').textContent = `, ${state.user?.email?.split('@')[0] || 'there'}`; $('page-overview').querySelector('h1').firstChild.textContent = `${greeting}`;
    $('user-email').textContent = state.user?.email || 'Your account'; $('avatar-initial').textContent = (state.user?.email || 'Y').charAt(0).toUpperCase(); $('user-menu').textContent = (state.user?.email || 'Y').charAt(0).toUpperCase();
    $('today-label').textContent = new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }
  function propertyCard(property, compact = false) {
    const related = state.accounts.filter(a => a.property_id === property.id);
    const locationText = [location(property)].filter(Boolean).join('');
    return `<article class="property-card" data-property-card="${esc(property.id)}"><div class="property-art"><span class="property-type">${esc(prettyKind(property.property_kind))}</span><span class="property-building"></span></div><div class="property-info"><h3>${esc(property.name)}</h3><div class="property-address">${esc(propertyAddress(property))}</div><div class="property-meta"><span>${related.length} account${related.length === 1 ? '' : 's'}</span><strong>${related.reduce((s,a) => s + Number(a.payment_amount || 0), 0) ? `${money(related.reduce((s,a) => s + Number(a.payment_amount || 0), 0))} / mo` : 'View details'}</strong></div></div></article>`;
  }
  function renderOverview() {
    $('stat-properties').textContent = state.properties.length; $('stat-accounts').textContent = state.accounts.filter(a => a.status === 'active').length;
    $('stat-collected').textContent = money(collectedSince(monthStart())); $('stat-expected').textContent = money(expectedThisMonth());
    const postedThisMonth=state.payments.filter(p=>isPosted(p)&&String(p.received_date)>=monthStart()); $('stat-collected-foot').textContent = `${postedThisMonth.length} payment${postedThisMonth.length === 1 ? '' : 's'} recorded`;
    const upcoming = state.accounts.filter(a => a.status === 'active' && a.next_due_date).sort((a,b) => String(a.next_due_date).localeCompare(String(b.next_due_date))).slice(0,4);
    $('upcoming-list').innerHTML = upcoming.length ? upcoming.map(a => { const p = state.properties.find(x => x.id === a.property_id); return `<div class="list-row"><span class="round-icon">${a.account_type === 'rental' ? '⌂' : '▤'}</span><div class="row-copy"><strong>${esc(a.party_name || a.name)}</strong><small>${esc(p?.name || 'Property')} · ${esc(prettyType(a.account_type))}</small></div><div class="row-right"><strong>${money(a.payment_amount)}</strong><small>Due ${fmtDate(a.next_due_date,{month:'short',day:'numeric'})}</small></div></div>`; }).join('') : '<div class="list-empty">No upcoming payments yet. Add an account to get started.</div>';
    const recent = state.payments.filter(isPosted).slice(0,4);
    $('activity-list').innerHTML = recent.length ? recent.map(p => { const a = state.accounts.find(x => x.id === p.account_id), prop = state.properties.find(x => x.id === a?.property_id); return `<div class="list-row"><span class="round-icon">↙</span><div class="row-copy"><strong>${esc(a?.party_name || a?.name || 'Payment')}</strong><small>${esc(prop?.name || 'Property')} · ${fmtDate(p.received_date,{month:'short',day:'numeric'})}</small></div><div class="row-right"><strong>${money(p.amount)}</strong><small>${esc(p.payment_method.replace('_',' '))}</small></div></div>`; }).join('') : '<div class="list-empty">Recorded payments will appear here.</div>';
    $('overview-properties').innerHTML = state.properties.slice(0,3).map(p => propertyCard(p,true)).join('') || '<div class="list-empty">Add your first property to build your portfolio.</div>';
  }
  function renderProperties() {
    const q = $('property-search').value.trim().toLowerCase(), kind = $('property-filter').value;
    const filtered = state.properties.filter(p => (!q || `${p.name} ${propertyAddress(p)}`.toLowerCase().includes(q)) && (kind === 'all' || state.accounts.some(a => a.property_id === p.id && a.account_type === kind)));
    $('properties-grid').innerHTML = filtered.map(p => propertyCard(p)).join('') || '<div class="list-empty">No matching properties. Add a property to get started.</div>';
    $('property-nav-count').textContent = state.properties.length;
  }
  function renderAccounts() {
    const q = $('account-search').value.trim().toLowerCase(), type = $('account-filter').value;
    const rows = state.accounts.filter(a => { const p = state.properties.find(x => x.id === a.property_id); return (!q || `${a.name} ${a.party_name} ${p?.name}`.toLowerCase().includes(q)) && (type === 'all' || a.account_type === type); });
    $('accounts-table').innerHTML = rows.map(a => { const p = state.properties.find(x => x.id === a.property_id); return `<tr><td><strong>${esc(a.name)}</strong><br><span class="kind-pill">${esc(prettyType(a.account_type))}</span></td><td>${esc(p?.name || '—')}</td><td>${esc(a.party_name || '—')}</td><td>${money(a.payment_amount)}</td><td>${a.account_type === 'rental' ? '—' : money(accountBalance(a))}</td><td><span class="status-pill">${esc(a.status || 'active')}</span></td><td><button class="table-action" data-detail="${esc(a.id)}">Open</button></td></tr>`; }).join('');
    $('accounts-empty').classList.toggle('hidden', rows.length > 0); $('account-nav-count').textContent = state.accounts.length;
    if (!rows.length) $('accounts-empty').textContent = 'No accounts yet. Add a rental, land contract, or private note.';
  }
  function renderPayments() {
    const period=$('payment-period').value,q=$('payment-search').value.trim().toLowerCase(),now=new Date(),type=$('transaction-type').value;
    const rows=[...state.payments.map(item=>({kind:'income',date:item.received_date,amount:Number(item.amount),item})),...state.expenses.map(item=>({kind:'expense',date:item.expense_date,amount:Number(item.amount),item}))]
      .filter(x=>(type==='all'||type===x.kind)&&(period==='all'||(period==='month'&&dateOnly(x.date)?.getMonth()===now.getMonth()&&dateOnly(x.date)?.getFullYear()===now.getFullYear())||(period==='year'&&dateOnly(x.date)?.getFullYear()===now.getFullYear())))
      .filter(x=>{const a=state.accounts.find(z=>z.id===x.item.account_id),p=x.kind==='expense'?state.properties.find(z=>z.id===x.item.property_id):state.properties.find(z=>z.id===a?.property_id);return !q||`${a?.name||''} ${a?.party_name||''} ${p?.name||''} ${x.item.memo||''} ${x.item.payee||''}`.toLowerCase().includes(q);})
      .sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    $('payments-table').innerHTML=rows.map(x=>{const item=x.item,exp=x.kind==='expense',voided=item.status==='voided',a=state.accounts.find(z=>z.id===item.account_id),p=exp?state.properties.find(z=>z.id===item.property_id):state.properties.find(z=>z.id===a?.property_id);return `<tr class="${voided?'transaction-voided':''}"><td>${fmtDate(x.date)}</td><td><span class="${exp?'expense-pill':'status-pill'}">${exp?'Expense':'Income'}${voided?' · voided':''}</span></td><td><strong>${esc(p?.name||'—')}</strong><br>${esc(a?.party_name||a?.name||'Property')}</td><td>${esc(exp?item.category:(a?.account_type==='rental'?item.income_category:`P ${money(item.principal_amount)} · I ${money(item.interest_amount)}`))}</td><td><strong>${exp?'−':''}${money(x.amount)}</strong></td><td>${esc(exp?(item.payee||item.payment_method):item.payment_method.replace('_',' '))}</td><td>${esc(item.memo||'—')}</td><td>${voided?'<span class="muted">Voided</span>':`<button type="button" class="text-button" data-void-transaction data-kind="${x.kind}" data-id="${esc(item.id)}">Void</button>`}</td></tr>`;}).join('');
    $('payments-empty').classList.toggle('hidden',rows.length>0);if(!rows.length)$('payments-empty').textContent='No transactions match this view.';
    const monthPayments=state.payments.filter(p=>isPosted(p)&&String(p.received_date)>=monthStart()),monthExpenses=state.expenses.filter(x=>String(x.expense_date)>=monthStart()&&isPosted(x)),income=sumPosted(monthPayments),expenses=sumPosted(monthExpenses);
    $('payments-collected').textContent=money(income);$('expenses-total').textContent=money(expenses);$('net-cash-flow').textContent=money(income-expenses);
  }
  function renderReports() {
    const y = new Date().getFullYear(), ytd = sumPosted(state.payments.filter(p=>dateOnly(p.received_date)?.getFullYear()===y)), costs=sumPosted(state.expenses.filter(p=>dateOnly(p.expense_date)?.getFullYear()===y));
    $('report-ytd').textContent=money(ytd); $('report-expenses-ytd').textContent=money(costs); $('report-net-ytd').textContent=money(ytd-costs);
    $('report-principal').textContent=money(state.accounts.filter(a=>a.account_type!=='rental').reduce((s,a)=>s+accountBalance(a),0));
    const labels=[['rental','Rentals'],['land_contract','Land contracts'],['note','Private notes']]; const counts=labels.map(([k])=>state.accounts.filter(a=>a.account_type===k).length), max=Math.max(1,...counts);
    $('account-breakdown').innerHTML=labels.map(([key,label],i)=>`<div class="breakdown-row"><span>${label}</span><div class="bar-track"><div class="bar-fill" style="width:${counts[i]/max*100}%"></div></div><strong>${counts[i]}</strong></div>`).join('');
  }
  function render() { updateGreeting(); renderOverview(); renderProperties(); renderAccounts(); renderPayments(); renderReports(); }
  function navigate(view) {
    state.view=view; document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x.id===`page-${view}`)); document.querySelectorAll('.nav-link').forEach(x=>x.classList.toggle('active',x.dataset.view===view));
    $('page-crumb').textContent=view.charAt(0).toUpperCase()+view.slice(1); window.scrollTo({top:0,behavior:'smooth'});
  }
  function openModal(id) { $(id).classList.remove('hidden'); document.body.style.overflow='hidden'; }
  function closeModal(modal) { modal.classList.add('hidden'); document.body.style.overflow=''; if(modal.id==='import-preview-modal')state.pendingImport=null; }
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
  function resetAccountForm() { $('account-form').reset(); $('account-id').value=''; $('account-start').value=todayIso(); $('account-payment').value='0'; $('account-late-fee').value='0'; $('account-grace').value='0'; $('account-modal-title').textContent='Add account'; updateLoanFields(); }
  function updateLoanFields() { const isRental=$('account-type').value==='rental'; $('loan-fields').classList.toggle('hidden',isRental); }

  async function saveProperty(event) {
    event.preventDefault(); const id=$('property-id').value;
    const payload={ user_id:state.user.id, name:$('property-name').value.trim(), address:$('property-address').value.trim(), city:$('property-city').value.trim()||null, state:$('property-state').value.trim().toUpperCase()||null, postal_code:$('property-zip').value.trim()||null, property_kind:$('property-kind').value, notes:$('property-notes').value.trim()||null };
    const q=id?state.client.from('pd_properties').update(payload).eq('id',id):state.client.from('pd_properties').insert(payload); const {error}=await q;
    if(error){toast(error.message);return;} closeModal($('property-modal')); resetPropertyForm(); await fetchAll(); toast(id?'Property updated':'Property added');
  }
  async function saveAccount(event) {
    event.preventDefault(); const id=$('account-id').value, type=$('account-type').value, payload={user_id:state.user.id,property_id:$('account-property').value,account_type:type,name:$('account-name').value.trim(),party_name:$('account-party').value.trim()||null,start_date:$('account-start').value,next_due_date:$('account-next-due').value||null,payment_amount:moneyInput($('account-payment').value),payment_frequency:$('account-frequency').value,original_principal:type==='rental'?0:moneyInput($('account-principal').value),interest_rate:type==='rental'?0:moneyInput($('account-rate').value),term_months:type==='rental'||!$('account-term').value?null:Number($('account-term').value),balloon_date:type==='rental'?null:$('account-balloon').value||null,late_fee:moneyInput($('account-late-fee').value),grace_days:Number($('account-grace').value||0),notes:$('account-notes').value.trim()||null};
    const q=id?state.client.from('pd_accounts').update(payload).eq('id',id):state.client.from('pd_accounts').insert(payload); const {error}=await q;
    if(error){toast(error.message);return;} closeModal($('account-modal')); resetAccountForm(); await fetchAll(); toast(id?'Account updated':'Account added');
  }
  function updateAllocationPreview() {
    const a=state.accounts.find(x=>x.id===$('payment-account').value), amount=moneyInput($('payment-amount').value), date=$('payment-date').value;
    if(!a||!amount){$('allocation-preview').innerHTML='';return;}
    const alloc=suggestedAllocation(a,amount,date);
    $('income-category-wrap').classList.toggle('hidden',a.account_type!=='rental');
    if(a.account_type==='rental'){$('allocation-preview').innerHTML='';return;}
    $('allocation-preview').innerHTML=`<div><strong>Suggested allocation — edit to match the agreement</strong></div><div class="form-row"><label>Interest<input id="alloc-interest" type="number" min="0" step="0.01" value="${alloc.interest.toFixed(2)}"></label><label>Principal<input id="alloc-principal" type="number" min="0" step="0.01" value="${alloc.principal.toFixed(2)}"></label></div><div class="form-row"><label>Fees<input id="alloc-fee" type="number" min="0" step="0.01" value="${alloc.fee.toFixed(2)}"></label><label>Unapplied<input id="alloc-unapplied" type="number" min="0" step="0.01" value="${alloc.unapplied.toFixed(2)}"></label></div><div id="allocation-total" class="allocation-note">Estimate uses simple daily interest. Check the contract and ensure allocations total the amount received.</div>`;
    const updateTotal=()=>{const sum=['alloc-interest','alloc-principal','alloc-fee','alloc-unapplied'].reduce((n,id)=>n+moneyInput($(id)?.value),0);$('allocation-total').textContent=`Allocated ${money(sum)} of ${money(amount)}${Math.round(sum*100)===Math.round(amount*100)?'':' — allocations must equal the amount received.'}`;};
    ['alloc-interest','alloc-principal','alloc-fee','alloc-unapplied'].forEach(id=>$(id).addEventListener('input',updateTotal));updateTotal();
  }
  async function savePayment(event) {
    event.preventDefault(); const account=state.accounts.find(a=>a.id===$('payment-account').value), amount=moneyInput($('payment-amount').value); if(!account||!amount)return;
    const alloc=account.account_type==='rental'?{principal:0,interest:0,fee:0,unapplied:0}:{principal:moneyInput($('alloc-principal').value),interest:moneyInput($('alloc-interest').value),fee:moneyInput($('alloc-fee').value),unapplied:moneyInput($('alloc-unapplied').value)};
    const allocated=alloc.principal+alloc.interest+alloc.fee+alloc.unapplied;
    if(account.account_type!=='rental'&&Math.round(allocated*100)!==Math.round(amount*100)){toast('Adjust the allocation so it equals the amount received');return;}
    const payload={user_id:state.user.id,account_id:account.id,amount,received_date:$('payment-date').value,payment_method:$('payment-method').value,income_category:account.account_type==='rental'?$('income-category').value:'installment',principal_amount:alloc.principal,interest_amount:alloc.interest,fee_amount:alloc.fee,unapplied_amount:alloc.unapplied,memo:$('payment-memo').value.trim()||null,source_type:'manual'};
    const {error}=await state.client.from('pd_payments').insert(payload); if(error){toast(error.message);return;}
    closeModal($('payment-modal')); $('payment-form').reset(); $('payment-date').value=todayIso(); await fetchAll(); toast('Payment recorded');
  }
  async function saveExpense(event) {
    event.preventDefault();
    const payload={user_id:state.user.id,property_id:$('expense-property').value,account_id:$('expense-account').value||null,amount:moneyInput($('expense-amount').value),expense_date:$('expense-date').value,category:$('expense-category').value,payee:$('expense-payee').value.trim()||null,payment_method:$('expense-method').value,memo:$('expense-memo').value.trim()||null,source_type:'manual'};
    const {error}=await state.client.from('pd_expenses').insert(payload);if(error){toast(error.message);return;}
    closeModal($('expense-modal'));$('expense-form').reset();$('expense-date').value=todayIso();await fetchAll();toast('Expense recorded');
  }
  function scheduleFor(account) {
    const principal=Number(account.original_principal||0), rate=Number(account.interest_rate||0)/100/12, n=Number(account.term_months||0);
    if(!principal||!n) return [];
    const pmt=Number(account.payment_amount)>0?Number(account.payment_amount):(rate?principal*rate/(1-Math.pow(1+rate,-n)):principal/n);
    let bal=principal, rows=[]; const start=dateOnly(account.start_date)||new Date();
    for(let i=1;i<=Math.min(n,600)&&bal>.005;i++) { const interest=bal*rate, principalPart=Math.min(bal,Math.max(0,pmt-interest)); bal=Math.max(0,bal-principalPart); const d=new Date(start); d.setMonth(d.getMonth()+i); rows.push({i,date:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,payment:principalPart+interest,principal:principalPart,interest,balance:bal}); }
    return rows;
  }
  function openAccountDetails(id) {
    const a=state.accounts.find(x=>x.id===id); if(!a)return; const p=state.properties.find(x=>x.id===a.property_id); const payments=state.payments.filter(x=>x.account_id===id); const schedule=a.account_type==='rental'?[]:scheduleFor(a);
    $('detail-title').textContent=a.name; const scheduleHTML=schedule.length?`<div class="detail-section"><h3>Estimated amortization schedule</h3><div class="schedule-table"><table><thead><tr><th># / Due</th><th>Payment</th><th>Principal</th><th>Interest</th><th>Balance</th></tr></thead><tbody>${schedule.map(s=>`<tr><td>${s.i} · ${fmtDate(s.date,{month:'short',year:'2-digit'})}</td><td>${money(s.payment)}</td><td>${money(s.principal)}</td><td>${money(s.interest)}</td><td>${money(s.balance)}</td></tr>`).join('')}</tbody></table></div><p class="field-hint">Illustrative schedule using monthly compounding. It does not apply the daily-interest payment allocations recorded above.</p></div>`:'';
    const postedPayments=payments.filter(isPosted);
    $('detail-content').innerHTML=`<div class="detail-kpis"><div class="detail-kpi"><small>Property</small><strong>${esc(p?.name||'—')}</strong></div><div class="detail-kpi"><small>Regular payment</small><strong>${money(a.payment_amount)}</strong></div><div class="detail-kpi"><small>${a.account_type==='rental'?'Collected to date':'Current principal'}</small><strong>${a.account_type==='rental'?money(postedPayments.reduce((s,x)=>s+Number(x.amount),0)):money(accountBalance(a))}</strong></div></div><div class="detail-section"><h3>${esc(prettyType(a.account_type))} · ${esc(a.party_name||'No party recorded')}</h3><div class="list-row"><div class="row-copy"><strong>${esc(propertyAddress(p||{}))}</strong><small>Next due ${fmtDate(a.next_due_date)} · ${esc(paymentFrequencyLabel(a.payment_frequency))}</small></div><button id="detail-edit" class="button secondary compact">Edit</button><button id="detail-record" class="button primary compact">Record payment</button></div></div>${scheduleHTML}<div class="detail-section"><h3>Payment history (${payments.length})</h3>${payments.length?`<div class="schedule-table"><table><thead><tr><th>Date</th><th>Received</th><th>Principal</th><th>Interest</th><th>Status</th><th>Memo</th></tr></thead><tbody>${payments.map(x=>`<tr class="${x.status==='voided'?'transaction-voided':''}"><td>${fmtDate(x.received_date)}</td><td>${money(x.amount)}</td><td>${money(x.principal_amount)}</td><td>${money(x.interest_amount)}</td><td>${x.status==='voided'?'Voided':'Posted'}</td><td>${esc(x.memo||'—')}</td></tr>`).join('')}</tbody></table></div>`:'<div class="list-empty">No payments recorded for this account.</div>'}</div><div class="detail-section"><button id="detail-delete" class="text-button">Close account and preserve its history</button></div>`;
    $('detail-edit').addEventListener('click',()=>{closeModal($('detail-modal'));editAccount(a);}); $('detail-record').addEventListener('click',()=>{closeModal($('detail-modal'));openPayment(a.id);}); $('detail-delete').addEventListener('click',()=>deleteAccount(a)); openModal('detail-modal');
  }
  async function deleteAccount(a) { if(!confirm(`Close “${a.name}”? Its payment history will remain in your records.`))return; const {error}=await state.client.from('pd_accounts').update({status:'closed'}).eq('id',a.id);if(error){toast(error.message);return;}closeModal($('detail-modal'));await fetchAll();toast('Account closed'); }
  async function voidTransaction(kind,id) { const table=kind==='income'?'pd_payments':'pd_expenses';if(!confirm(`Void this ${kind==='income'?'income entry':'expense'}? It will remain in the audit history but stop affecting balances and reports.`))return;const reason=prompt('Optional reason for the audit record:','Entered in error');if(reason===null)return;const {data,error}=await state.client.from(table).update({status:'voided',voided_at:new Date().toISOString(),void_reason:reason.trim()||'Voided by owner'}).eq('id',id).eq('status','posted').select('id').maybeSingle();if(error){toast(error.message);return;}if(!data){toast('This transaction was already voided or is no longer available.');return;}await fetchAll();toast('Transaction voided; original entry preserved'); }
  function editAccount(a) {
    resetAccountForm(); populateFormOptions(); $('account-modal-title').textContent='Edit account'; $('account-id').value=a.id; $('account-type').value=a.account_type; updateLoanFields(); $('account-property').value=a.property_id; $('account-name').value=a.name; $('account-party').value=a.party_name||''; $('account-start').value=a.start_date; $('account-next-due').value=a.next_due_date||''; $('account-payment').value=a.payment_amount; $('account-frequency').value=a.payment_frequency; $('account-principal').value=a.original_principal; $('account-rate').value=a.interest_rate; $('account-term').value=a.term_months||''; $('account-balloon').value=a.balloon_date||''; $('account-late-fee').value=a.late_fee; $('account-grace').value=a.grace_days; $('account-notes').value=a.notes||''; openModal('account-modal');
  }
  function openPayment(accountId) { populateFormOptions(); $('payment-form').reset(); $('payment-date').value=todayIso(); if(accountId)$('payment-account').value=accountId; updateAllocationPreview(); openModal('payment-modal'); }
  function openExpense(propertyId) { populateFormOptions(); $('expense-form').reset(); $('expense-date').value=todayIso(); if(propertyId)$('expense-property').value=propertyId; openModal('expense-modal'); }
  function setAuthMode(signup) { $('auth-form').dataset.mode=signup?'signup':'signin'; $('auth-title').textContent=signup?'Create your account':'Welcome back'; document.querySelector('.auth-intro').textContent=signup?'Set up your private PropertyDesk workspace.':'Sign in to manage your properties and accounts.'; $('auth-submit').textContent=signup?'Create account':'Sign in'; $('auth-password').autocomplete=signup?'new-password':'current-password'; $('auth-toggle').textContent=signup?'Already have an account? Sign in':'Create an account'; $('auth-message').textContent=''; }
  async function submitAuth(event) { event.preventDefault(); const email=$('auth-email').value.trim(), password=$('auth-password').value, signup=$('auth-form').dataset.mode==='signup'; $('auth-submit').disabled=true; $('auth-submit').textContent='Please wait…'; let result;
    if(signup) result=await state.client.auth.signUp({email,password}); else result=await state.client.auth.signInWithPassword({email,password});
    $('auth-submit').disabled=false; $('auth-submit').textContent=signup?'Create account':'Sign in';
    if(result.error){$('auth-message').textContent=result.error.message;return;}
    if(signup&&!result.data.session){$('auth-message').textContent='Check your email to confirm your account, then come back to sign in.';return;}
    $('auth-message').textContent=''; if(result.data.user){state.user=result.data.user; await startWorkspace();}
  }
  async function startWorkspace() { showApp(); try { await fetchAll(); } catch { /* fetchAll already reports the failure */ } }

  function stageImport(title, rows, commit, note='') {
    if(!rows.length)throw new Error('There are no valid rows to import.');
    state.pendingImport={rows,commit};$('import-preview-title').textContent=title;$('import-preview-summary').textContent=`${rows.length} row${rows.length===1?'':'s'} · previewing up to 15${note?` · ${note}`:''}`;
    const keys=[...new Set(rows.slice(0,15).flatMap(row=>Object.keys(row)))];
    $('import-preview-head').innerHTML=`<tr>${keys.map(key=>`<th>${esc(key.replaceAll('_',' '))}</th>`).join('')}</tr>`;
    $('import-preview-body').innerHTML=rows.slice(0,15).map(row=>`<tr>${keys.map(key=>`<td>${esc(row[key]??'')}</td>`).join('')}</tr>`).join('');
    openModal('import-preview-modal');
  }
  async function importAccounts(file) {
    const status=$('import-status'); status.textContent=''; status.classList.remove('success');
    try { const rows=parseCSV(await file.text()); if(!rows.length)throw new Error('The CSV file has no account rows.'); const staged=[];
      const seenAccounts=new Set();for(const row of rows){const required=['property_name','property_address','account_type','account_name'];for(const key of required)if(!row[key])throw new Error(`Missing required column value “${key}” in an account row.`);const type=row.account_type.toLowerCase();if(!['rental','land_contract','note'].includes(type))throw new Error(`Invalid account_type “${row.account_type}”. Use rental, land_contract, or note.`);const accountKey=`${row.account_name.toLowerCase()}|${row.property_address.toLowerCase()}`;if(state.accounts.some(a=>a.name.toLowerCase()===row.account_name.toLowerCase()&&state.properties.find(p=>p.id===a.property_id)?.address.toLowerCase()===row.property_address.toLowerCase())||seenAccounts.has(accountKey))throw new Error(`Possible duplicate account: ${row.account_name} at ${row.property_address}. Review the CSV and existing account first.`);seenAccounts.add(accountKey);const amount=csvMoney(row.payment_amount,`${row.account_name} payment amount`,{optional:true}),principal=type==='rental'?0:csvMoney(row.original_principal,`${row.account_name} principal`,{optional:true}),rate=csvMoney(row.interest_rate,`${row.account_name} interest rate`,{optional:true});if(rate>100)throw new Error(`Interest rate must be 100% or less for ${row.account_name}.`);const frequency=row.payment_frequency||'monthly',startDate=row.start_date||todayIso();if(!['monthly','weekly','biweekly','quarterly','annual'].includes(frequency)||!validIsoDate(startDate)||(row.next_due_date&&!validIsoDate(row.next_due_date))||(row.balloon_date&&!validIsoDate(row.balloon_date)))throw new Error(`Invalid payment frequency or date for ${row.account_name}.`);const term=row.term_months?Number(row.term_months):null,graceDays=Number(row.grace_days||0);if(term!==null&&(!Number.isInteger(term)||term<1))throw new Error(`Term months must be a positive whole number for ${row.account_name}.`);if(!Number.isInteger(graceDays)||graceDays<0)throw new Error(`Grace days must be a nonnegative whole number for ${row.account_name}.`);const propertyKind=row.property_kind||'residential';if(!['residential','land','commercial','other'].includes(propertyKind))throw new Error(`Invalid property_kind “${propertyKind}” for ${row.property_name}.`);staged.push({property_name:row.property_name,property_address:row.property_address,account_type:type,account_name:row.account_name,party_name:row.party_name||'',start_date:startDate,next_due_date:row.next_due_date||'',payment_amount:amount,payment_frequency:frequency,original_principal:principal,interest_rate:rate,term_months:row.term_months||'',balloon_date:row.balloon_date||'',late_fee:csvMoney(row.late_fee,`${row.account_name} late fee`,{optional:true}),grace_days:graceDays,notes:row.notes||'',city:row.city||null,state:row.state||null,postal_code:row.postal_code||null,property_kind:propertyKind});}
      stageImport('Review account import',staged,async()=>{const payload=staged.map(row=>({property_name:row.property_name,property_address:row.property_address,city:row.city,state:row.state,postal_code:row.postal_code,property_kind:row.property_kind,account_type:row.account_type,account_name:row.account_name,party_name:row.party_name||null,start_date:row.start_date,next_due_date:row.next_due_date||null,payment_amount:row.payment_amount,payment_frequency:row.payment_frequency,original_principal:row.original_principal,interest_rate:row.interest_rate,term_months:row.term_months?Number(row.term_months):null,balloon_date:row.balloon_date||null,late_fee:row.late_fee,grace_days:row.grace_days,notes:row.notes||null}));const {data,error}=await state.client.rpc('pd_import_propertydesk_accounts',{p_rows:payload});if(error)throw error;await fetchAll();status.textContent=`Imported ${Number(data)||payload.length} account${payload.length===1?'':'s'} successfully.`;status.classList.add('success');toast('Import complete');});
    }catch(error){status.textContent=`Import failed: ${error.message}`;}
    $('import-file').value='';
  }
  async function importExpenses(file) {
    const status=$('import-status');status.textContent='';status.classList.remove('success');
    try {const rows=parseCSV(await file.text());if(!rows.length)throw new Error('The CSV file has no expense rows.');const staged=[];
      for(const row of rows){if(!row.property_name||!row.property_address||!row.expense_date||!row.amount)throw new Error('Each expense row needs property_name, property_address, expense_date, and amount.');const p=state.properties.find(x=>x.name.toLowerCase()===row.property_name.toLowerCase()&&x.address.toLowerCase()===row.property_address.toLowerCase());if(!p)throw new Error(`Property not found: ${row.property_name} at ${row.property_address}. Add or import the property first.`);const account=row.account_name?state.accounts.find(a=>a.property_id===p.id&&a.name.toLowerCase()===row.account_name.toLowerCase()):null;if(row.account_name&&!account)throw new Error(`Account not found for ${row.property_name}: ${row.account_name}.`);const amount=csvMoney(row.amount,`expense at ${row.property_name}`,{minimum:0.01});if(!validIsoDate(row.expense_date))throw new Error(`Invalid expense date ${row.expense_date}.`);const category=row.category||'other',method=row.payment_method||'manual';if(!['repairs','contractor','materials','taxes','insurance','utilities','management','other'].includes(category))throw new Error(`Invalid expense category “${category}”.`);if(!['manual','check','cash','bank_transfer','card','other'].includes(method))throw new Error(`Invalid payment method “${method}” for expense.`);staged.push({property_name:p.name,property_address:p.address,account_name:account?.name||'',expense_date:row.expense_date,amount,category,payee:row.payee||'',payment_method:method,memo:[row.memo,row.source_note].filter(Boolean).join(' · ')});}
      const seen=new Set(),duplicates=staged.filter(x=>{const key=`${x.property_name}|${x.property_address}|${x.expense_date}|${x.amount}|${x.payee.toLowerCase()}`,dupe=seen.has(key)||state.expenses.some(e=>e.property_id===state.properties.find(p=>p.name===x.property_name&&p.address===x.property_address)?.id&&e.expense_date===x.expense_date&&Number(e.amount)===x.amount&&String(e.payee||'').toLowerCase()===x.payee.toLowerCase());seen.add(key);return dupe;}).length;
      stageImport('Review expense import',staged,async()=>{const payload=staged.map(row=>{const p=state.properties.find(x=>x.name===row.property_name&&x.address===row.property_address),a=row.account_name?state.accounts.find(x=>x.property_id===p.id&&x.name===row.account_name):null;return {user_id:state.user.id,property_id:p.id,account_id:a?.id||null,expense_date:row.expense_date,amount:row.amount,category:row.category,payee:row.payee||null,payment_method:row.payment_method,memo:row.memo||null,source_type:'csv_import'};});const {error}=await state.client.from('pd_expenses').insert(payload);if(error)throw error;await fetchAll();status.textContent=`Imported ${payload.length} expense${payload.length===1?'':'s'} successfully.`;status.classList.add('success');toast('Expense import complete');},duplicates?`${duplicates} possible duplicate row(s); cancel to edit the CSV if unintended`: 'No matching existing rows detected');
    }catch(error){status.textContent=`Import needs review: ${error.message}`;}
    $('expense-import-file').value='';
  }
  async function importPayments(file) {
    const status=$('import-status');status.textContent='';status.classList.remove('success');
    try{const rows=parseCSV(await file.text());if(!rows.length)throw new Error('The CSV file has no payment rows.');const staged=[];
      for(const row of rows){if(!row.property_name||!row.property_address||!row.account_name||!row.received_date||!row.amount)throw new Error('Each payment row needs property_name, property_address, account_name, received_date, and amount.');const p=state.properties.find(x=>x.name.toLowerCase()===row.property_name.toLowerCase()&&x.address.toLowerCase()===row.property_address.toLowerCase());if(!p)throw new Error(`Property not found: ${row.property_name} at ${row.property_address}. Import properties and accounts first.`);const a=state.accounts.find(x=>x.property_id===p.id&&x.name.toLowerCase()===row.account_name.toLowerCase());if(!a)throw new Error(`Account not found: ${row.account_name} at ${row.property_name}.`);const amount=csvMoney(row.amount,`payment for ${a.name}`,{minimum:0.01}),paymentDate=row.received_date;if(!validIsoDate(paymentDate))throw new Error(`Invalid payment date ${row.received_date}.`);const incomeCategory=row.income_category|| (a.account_type==='rental'?'rent':'installment');if(!['rent','late_fee','deposit','installment','other'].includes(incomeCategory))throw new Error(`Invalid income category “${incomeCategory}”.`);const method=row.payment_method||'manual';if(!['manual','check','cash','bank_transfer','money_order','card'].includes(method))throw new Error(`Invalid payment method “${method}”.`);const alloc={principal:csvMoney(row.principal_amount,`${a.name} principal allocation`,{optional:true}),interest:csvMoney(row.interest_amount,`${a.name} interest allocation`,{optional:true}),fee:csvMoney(row.fee_amount,`${a.name} fee allocation`,{optional:true}),unapplied:csvMoney(row.unapplied_amount,`${a.name} unapplied allocation`,{optional:true})};if(a.account_type==='rental'){alloc.principal=alloc.interest=alloc.fee=alloc.unapplied=0;}else if(Math.round((alloc.principal+alloc.interest+alloc.fee+alloc.unapplied)*100)!==Math.round(amount*100))throw new Error(`Payment allocations for ${a.name} on ${paymentDate} must add up to ${money(amount)}.`);staged.push({property_name:p.name,property_address:p.address,account_name:a.name,received_date:paymentDate,amount,income_category,payment_method:method,principal_amount:alloc.principal,interest_amount:alloc.interest,fee_amount:alloc.fee,unapplied_amount:alloc.unapplied,memo:row.memo||''});}
      const seen=new Set(),duplicateCount=staged.filter(x=>{const key=`${x.property_name}|${x.property_address}|${x.account_name}|${x.received_date}|${x.amount}`,a=state.accounts.find(z=>z.name===x.account_name&&z.property_id===state.properties.find(p=>p.name===x.property_name&&p.address===x.property_address)?.id),dupe=seen.has(key)||state.payments.some(p=>p.account_id===a?.id&&p.received_date===x.received_date&&Number(p.amount)===x.amount);seen.add(key);return dupe;}).length;
      stageImport('Review payment import',staged,async()=>{const rowsToInsert=staged.map(x=>({user_id:state.user.id,account_id:state.accounts.find(a=>a.name===x.account_name&&state.properties.find(p=>p.id===a.property_id)?.name===x.property_name&&state.properties.find(p=>p.id===a.property_id)?.address===x.property_address).id,received_date:x.received_date,amount:x.amount,income_category:x.income_category,payment_method:x.payment_method,principal_amount:x.principal_amount,interest_amount:x.interest_amount,fee_amount:x.fee_amount,unapplied_amount:x.unapplied_amount,memo:x.memo||null,source_type:'csv_import'}));const {error}=await state.client.from('pd_payments').insert(rowsToInsert);if(error)throw error;await fetchAll();status.textContent=`Imported ${rowsToInsert.length} payment${rowsToInsert.length===1?'':'s'} successfully.`;status.classList.add('success');toast('Payment import complete');},duplicateCount?`${duplicateCount} possible duplicate row(s); cancel to edit the CSV if unintended`: 'No matching existing rows detected');
    }catch(error){status.textContent=`Payment import needs review: ${error.message}`;}
    $('payment-import-file').value='';
  }
  function csvCell(v){const s=String(v??'');return /[",\r\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;}
  function downloadCSV(filename,headers,rows){const csv=[headers,...rows].map(row=>row.map(csvCell).join(',')).join('\r\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function exportAll(){downloadCSV(`propertydesk-backup-${todayIso()}.csv`,['record_type','property_name','property_address','city','state','postal_code','property_kind','account_type','account_name','party_name','start_date','next_due_date','payment_amount','payment_frequency','original_principal','interest_rate','term_months','balloon_date','late_fee','grace_days','status','payment_id','received_date','amount','principal_amount','interest_amount','fee_amount','unapplied_amount','payment_method','expense_date','category','payee','memo','transaction_status','voided_at','void_reason'],[
    ...state.properties.map(p=>({record_type:'property',property_name:p.name,property_address:p.address,city:p.city,state:p.state,postal_code:p.postal_code,property_kind:p.property_kind})),
    ...state.accounts.flatMap(a=>{const p=state.properties.find(x=>x.id===a.property_id);const base={record_type:'account',property_name:p?.name,property_address:p?.address,city:p?.city,state:p?.state,postal_code:p?.postal_code,property_kind:p?.property_kind,account_type:a.account_type,account_name:a.name,party_name:a.party_name,start_date:a.start_date,next_due_date:a.next_due_date,payment_amount:a.payment_amount,payment_frequency:a.payment_frequency,original_principal:a.original_principal,interest_rate:a.interest_rate,term_months:a.term_months,balloon_date:a.balloon_date,late_fee:a.late_fee,grace_days:a.grace_days,status:a.status};return [base,...state.payments.filter(x=>x.account_id===a.id).map(x=>({...base,record_type:'payment',payment_id:x.id,received_date:x.received_date,amount:x.amount,principal_amount:x.principal_amount,interest_amount:x.interest_amount,fee_amount:x.fee_amount,unapplied_amount:x.unapplied_amount,payment_method:x.payment_method,memo:x.memo,transaction_status:x.status||'posted',voided_at:x.voided_at,void_reason:x.void_reason}))];}),
    ...state.expenses.map(x=>{const p=state.properties.find(z=>z.id===x.property_id),a=state.accounts.find(z=>z.id===x.account_id);return {record_type:'expense',property_name:p?.name,property_address:p?.address,account_name:a?.name,expense_date:x.expense_date,amount:x.amount,category:x.category,payee:x.payee,payment_method:x.payment_method,memo:x.memo,transaction_status:x.status||'posted',voided_at:x.voided_at,void_reason:x.void_reason};})]);toast('Backup exported');}
  function exportReport(){downloadCSV(`propertydesk-accounts-${todayIso()}.csv`,['account_name','account_type','property','party','monthly_due','outstanding_principal','next_due_date','status'],state.accounts.map(a=>[a.name,prettyType(a.account_type),state.properties.find(p=>p.id===a.property_id)?.name||'',a.party_name,a.payment_amount,a.account_type==='rental'?'':accountBalance(a),a.next_due_date,a.status]));}

  function attachEvents() {
    document.querySelectorAll('.nav-link').forEach(x=>x.addEventListener('click',()=>navigate(x.dataset.view)));
    document.querySelectorAll('[data-goto]').forEach(x=>x.addEventListener('click',()=>navigate(x.dataset.goto)));
    document.querySelectorAll('[data-open="property-modal"]').forEach(x=>x.addEventListener('click',()=>{resetPropertyForm();openModal('property-modal');}));
    document.querySelectorAll('[data-open="account-modal"]').forEach(x=>x.addEventListener('click',()=>{if(!state.properties.length){toast('Add a property before creating an account');navigate('properties');return;}resetAccountForm();populateFormOptions();openModal('account-modal');}));
    document.querySelectorAll('[data-open="payment-modal"]').forEach(x=>x.addEventListener('click',()=>{if(!state.accounts.length){toast('Add an account before recording a payment');navigate('accounts');return;}openPayment();}));
    $('quick-payment').addEventListener('click',()=>{if(!state.accounts.length){toast('Add an account before recording a payment');navigate('accounts');return;}openPayment();});
    document.querySelectorAll('[data-close]').forEach(x=>x.addEventListener('click',()=>closeModal(x.closest('.modal'))));
    $('property-form').addEventListener('submit',saveProperty); $('account-form').addEventListener('submit',saveAccount); $('payment-form').addEventListener('submit',savePayment); $('expense-form').addEventListener('submit',saveExpense);
    $('account-type').addEventListener('change',updateLoanFields); $('payment-account').addEventListener('change',updateAllocationPreview); $('payment-amount').addEventListener('input',updateAllocationPreview); $('payment-date').addEventListener('change',updateAllocationPreview);
    $('expense-property').addEventListener('change',()=>{const pid=$('expense-property').value,related=state.accounts.filter(a=>a.property_id===pid);fillSelect('expense-account',related.map(a=>({value:a.id,label:`${a.name} — ${prettyType(a.account_type)}`})),'Property level');});
    $('property-search').addEventListener('input',renderProperties); $('property-filter').addEventListener('change',renderProperties); $('account-search').addEventListener('input',renderAccounts); $('account-filter').addEventListener('change',renderAccounts); $('payment-search').addEventListener('input',renderPayments); $('payment-period').addEventListener('change',renderPayments); $('transaction-type').addEventListener('change',renderPayments);
    document.addEventListener('click',e=>{const voidButton=e.target.closest('[data-void-transaction]');if(voidButton){voidTransaction(voidButton.dataset.kind,voidButton.dataset.id);return;}const a=e.target.closest('[data-detail]');if(a)openAccountDetails(a.dataset.detail);const card=e.target.closest('[data-property-card]');if(card){navigate('accounts');$('account-search').value=state.properties.find(p=>p.id===card.dataset.propertyCard)?.name||'';renderAccounts();}});
    $('sign-out').addEventListener('click',async()=>{await state.client.auth.signOut();state.user=null;state.properties=[];state.accounts=[];state.payments=[];showAuth();setAuthMode(false);}); $('auth-toggle').addEventListener('click',()=>setAuthMode($('auth-form').dataset.mode!=='signup')); $('auth-form').addEventListener('submit',submitAuth);
    document.querySelectorAll('[data-open="expense-modal"]').forEach(x=>x.addEventListener('click',()=>{if(!state.properties.length){toast('Add a property before recording an expense');navigate('properties');return;}openExpense();}));
    $('import-commit').addEventListener('click',async()=>{const pending=state.pendingImport;if(!pending)return;$('import-commit').disabled=true;try{state.pendingImport=null;closeModal($('import-preview-modal'));await pending.commit();}catch(error){$('import-status').textContent=`Import failed: ${error.message}`;}finally{$('import-commit').disabled=false;}});
    $('import-file').addEventListener('change',e=>{if(e.target.files[0])importAccounts(e.target.files[0]);}); $('payment-import-file').addEventListener('change',e=>{if(e.target.files[0])importPayments(e.target.files[0]);}); $('expense-import-file').addEventListener('change',e=>{if(e.target.files[0])importExpenses(e.target.files[0]);}); $('export-all').addEventListener('click',exportAll); $('export-report').addEventListener('click',exportReport);
    document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.modal:not(.hidden)').forEach(closeModal);});
  }

  async function init() {
    attachEvents(); $('payment-date').value=todayIso(); $('account-start').value=todayIso(); setAuthMode(false);
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js').catch(error => console.warn('PropertyDesk shell cache could not be registered:', error));
    if(!configured){showConfigError();return;}
    state.client=window.supabase.createClient(config.supabaseUrl,config.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    const {data:{session}}=await state.client.auth.getSession();
    if(session?.user){state.user=session.user;await startWorkspace();} else showAuth();
    state.client.auth.onAuthStateChange((_event,sessionNow)=>{if(sessionNow?.user){state.user=sessionNow.user;startWorkspace();}else if(state.user){state.user=null;showAuth();}});
  }
  document.addEventListener('DOMContentLoaded',init);
})();
