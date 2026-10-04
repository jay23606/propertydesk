/* CSV row validation and normalization used by PropertyDesk imports. */
(() => {
  'use strict';

  const { csvMoney, csvRate, markPossibleDuplicates, validIsoDate, validateImportRows } = globalThis.PropertyDeskImportUtils;

  function validateAccountRows(rows, properties, accounts, today) {
    const seenAccounts=new Set();
    return validateImportRows(rows, row => {
      const required=['property_name','property_address','account_type','account_name'];
      for(const key of required)if(!row[key])throw new Error(`Missing required value “${key}”.`);
      const type=row.account_type.toLowerCase();
      if(!['rental','land_contract','note'].includes(type))throw new Error(`Invalid account_type “${row.account_type}”. Use rental, land_contract, or note.`);
      const accountKey=`${row.account_name.toLowerCase()}|${row.property_name.toLowerCase()}|${row.property_address.toLowerCase()}`;
      if(accounts.some(a=>a.name.toLowerCase()===row.account_name.toLowerCase()&&properties.find(p=>p.id===a.property_id)?.name.toLowerCase()===row.property_name.toLowerCase()&&properties.find(p=>p.id===a.property_id)?.address.toLowerCase()===row.property_address.toLowerCase())||seenAccounts.has(accountKey))throw new Error(`Possible duplicate account: ${row.account_name} at ${row.property_address}.`);
      const amount=csvMoney(row.payment_amount,`${row.account_name} payment amount`,{optional:true});
      const principal=type==='rental'?0:csvMoney(row.original_principal,`${row.account_name} principal`,{optional:true});
      const principalInterestAmount=type==='rental'||!row.principal_interest_amount?null:csvMoney(row.principal_interest_amount,`${row.account_name} P&I payment`);
      const escrowAmount=type==='rental'?0:csvMoney(row.escrow_amount,`${row.account_name} monthly escrow`,{optional:true});
      const openingBalance=(row.ledger_opening_balance||'').trim()===''?null:csvMoney(row.ledger_opening_balance,`${row.account_name} opening balance`);
      if(openingBalance!==null&&!row.ledger_opening_date)throw new Error(`A ledger opening date is required when an opening balance is set for ${row.account_name}.`);
      const rate=csvRate(row.interest_rate,`${row.account_name} interest rate`,{optional:true});
      const frequency=row.payment_frequency||'monthly',startDate=row.start_date||today;
      if(!['monthly','weekly','biweekly','quarterly','annual'].includes(frequency)||!validIsoDate(startDate)||(row.next_due_date&&!validIsoDate(row.next_due_date))||(row.balloon_date&&!validIsoDate(row.balloon_date))||(row.ledger_opening_date&&!validIsoDate(row.ledger_opening_date)))throw new Error(`Invalid payment frequency or date for ${row.account_name}.`);
      const term=row.term_months?Number(row.term_months):null,graceDays=Number(row.grace_days||0);
      if(term!==null&&(!Number.isInteger(term)||term<1))throw new Error(`Term months must be a positive whole number for ${row.account_name}.`);
      if(!Number.isInteger(graceDays)||graceDays<0)throw new Error(`Grace days must be a nonnegative whole number for ${row.account_name}.`);
      const propertyKind=row.property_kind||'residential';
      if(!['residential','land','commercial','other'].includes(propertyKind))throw new Error(`Invalid property_kind “${row.property_kind}” for ${row.property_name}.`);
      const lateFee=csvMoney(row.late_fee,`${row.account_name} late fee`,{optional:true});
      const partyEmail=(row.party_email||'').split(/[;,]/).map(email=>email.trim()).filter(Boolean);
      if(partyEmail.some(email=>!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))throw new Error(`Invalid tenant/buyer email for ${row.account_name}.`);
      seenAccounts.add(accountKey);
      return {property_name:row.property_name,property_address:row.property_address,account_type:type,account_name:row.account_name,party_name:row.party_name||'',party_email:partyEmail.join(', '),start_date:startDate,next_due_date:row.next_due_date||'',payment_amount:amount,payment_frequency:frequency,original_principal:principal,principal_interest_amount:principalInterestAmount,escrow_amount:escrowAmount,ledger_opening_balance:openingBalance,ledger_opening_date:row.ledger_opening_date||'',interest_rate:rate,term_months:row.term_months||'',balloon_date:row.balloon_date||'',late_fee:lateFee,grace_days:graceDays,notes:row.notes||'',city:row.city||null,state:row.state||null,postal_code:row.postal_code||null,property_kind:propertyKind};
    });
  }

  function validateExpenseRows(rows, properties, accounts, expenses) {
    const expenseKey=(propertyId,accountId,date,amount,payee,memo)=>JSON.stringify([propertyId,accountId||'',date,Number(amount).toFixed(2),String(payee||'').trim().toLowerCase(),String(memo||'').trim().toLowerCase()]);
    const existingKeys=expenses.map(x=>expenseKey(x.property_id,x.account_id,x.expense_date,x.amount,x.payee,x.memo));
    const validation=validateImportRows(rows,row=>{
      if(!row.property_name||!row.property_address||!row.expense_date||!row.amount)throw new Error('Each expense row needs property_name, property_address, expense_date, and amount.');
      const property=properties.find(x=>x.name.toLowerCase()===row.property_name.toLowerCase()&&x.address.toLowerCase()===row.property_address.toLowerCase());
      if(!property)throw new Error(`Property not found: ${row.property_name} at ${row.property_address}. Add or import the property first.`);
      const account=row.account_name?accounts.find(a=>a.property_id===property.id&&a.name.toLowerCase()===row.account_name.toLowerCase()):null;
      if(row.account_name&&!account)throw new Error(`Account not found for ${row.property_name}: ${row.account_name}.`);
      const amount=csvMoney(row.amount,`expense at ${row.property_name}`,{minimum:0.01});
      if(!validIsoDate(row.expense_date))throw new Error(`Invalid expense date ${row.expense_date}.`);
      const category=row.category||'other',method=row.payment_method||'manual';
      if(!['repairs','contractor','materials','taxes','insurance','utilities','management','deposit_refund','other'].includes(category))throw new Error(`Invalid expense category “${category}”.`);
      if(category==='deposit_refund'&&account?.account_type!=='rental')throw new Error('A security deposit refund must be linked to a rental account.');
      if(!['manual','check','cash','bank_transfer','card','other'].includes(method))throw new Error(`Invalid payment method “${method}” for expense.`);
      return {property_name:property.name,property_address:property.address,account_name:account?.name||'',expense_date:row.expense_date,amount,category,payee:row.payee||'',payment_method:method,memo:[row.memo,row.source_note].filter(Boolean).join(' · ')};
    });
    const valid=markPossibleDuplicates(validation.valid,existingKeys,row=>{
      const property=properties.find(x=>x.name===row.property_name&&x.address===row.property_address),account=row.account_name?accounts.find(x=>x.property_id===property?.id&&x.name===row.account_name):null;
      return expenseKey(property?.id,account?.id,row.expense_date,row.amount,row.payee,row.memo);
    });
    return {...validation,valid};
  }

  function validatePaymentRows(rows, properties, accounts, payments) {
    const paymentKey=(accountId,date,amount,memo)=>JSON.stringify([accountId,date,Number(amount).toFixed(2),String(memo||'').trim().toLowerCase()]);
    const existingKeys=payments.map(x=>paymentKey(x.account_id,x.received_date,x.amount,x.memo));
    const validation=validateImportRows(rows,row=>{
      if(!row.property_name||!row.property_address||!row.account_name||!row.received_date||!row.amount)throw new Error('Each payment row needs property_name, property_address, account_name, received_date, and amount.');
      const property=properties.find(x=>x.name.toLowerCase()===row.property_name.toLowerCase()&&x.address.toLowerCase()===row.property_address.toLowerCase());
      if(!property)throw new Error(`Property not found: ${row.property_name} at ${row.property_address}. Import properties and accounts first.`);
      const account=accounts.find(x=>x.property_id===property.id&&x.name.toLowerCase()===row.account_name.toLowerCase());
      if(!account)throw new Error(`Account not found: ${row.account_name} at ${row.property_name}.`);
      const amount=csvMoney(row.amount,`payment for ${account.name}`,{minimum:0.01}),paymentDate=row.received_date;
      if(!validIsoDate(paymentDate))throw new Error(`Invalid payment date ${row.received_date}.`);
      const incomeCategory=row.income_category||(account.account_type==='rental'?'rent':'installment');
      const allowedCategories=account.account_type==='rental'?['rent','late_fee','deposit','other']:['installment','late_fee','other'];
      if(!allowedCategories.includes(incomeCategory))throw new Error(`Invalid income category “${incomeCategory}” for ${account.account_type}.`);
      const method=row.payment_method||'manual';
      if(!['manual','check','cash','bank_transfer','money_order','card'].includes(method))throw new Error(`Invalid payment method “${method}”.`);
      const allocation={principal:csvMoney(row.principal_amount,`${account.name} principal allocation`,{optional:true}),interest:csvMoney(row.interest_amount,`${account.name} interest allocation`,{optional:true}),fee:csvMoney(row.fee_amount,`${account.name} fee allocation`,{optional:true}),escrow:csvMoney(row.escrow_amount,`${account.name} escrow allocation`,{optional:true}),unapplied:csvMoney(row.unapplied_amount,`${account.name} unapplied allocation`,{optional:true})};
      if(account.account_type==='rental')allocation.principal=allocation.interest=allocation.fee=allocation.escrow=allocation.unapplied=0;
      else if(Math.round((allocation.principal+allocation.interest+allocation.fee+allocation.escrow+allocation.unapplied)*100)!==Math.round(amount*100))throw new Error(`Payment allocations for ${account.name} on ${paymentDate} must add up to ${new Intl.NumberFormat(undefined,{style:'currency',currency:'USD'}).format(amount)}.`);
      return {property_name:property.name,property_address:property.address,account_name:account.name,received_date:paymentDate,amount,income_category:incomeCategory,payment_method:method,principal_amount:allocation.principal,interest_amount:allocation.interest,fee_amount:allocation.fee,escrow_amount:allocation.escrow,unapplied_amount:allocation.unapplied,memo:row.memo||''};
    });
    const valid=markPossibleDuplicates(validation.valid,existingKeys,row=>{
      const property=properties.find(x=>x.name===row.property_name&&x.address===row.property_address),account=accounts.find(x=>x.property_id===property?.id&&x.name===row.account_name);
      return paymentKey(account?.id,row.received_date,row.amount,row.memo);
    });
    return {...validation,valid};
  }

  const workflows=Object.freeze({validateAccountRows,validateExpenseRows,validatePaymentRows});
  globalThis.PropertyDeskImportWorkflows=workflows;
  if(typeof module!=='undefined'&&module.exports)module.exports=workflows;
})();
