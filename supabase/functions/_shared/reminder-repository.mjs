export async function loadEnabledReminderAccounts(db) {
  return db
    .from("pd_accounts")
    .select(
      "id,user_id,property_id,account_type,name,party_name,party_email,start_date,next_due_date,payment_amount,payment_frequency,status",
    )
    .eq("monthly_reminder_enabled", true)
    .eq("status", "active");
}

export async function loadReminderRecords(
  db,
  accounts,
  monthEnd,
  trackingStart,
) {
  const accountIds = accounts.map((account) => account.id);
  const propertyIds = [
    ...new Set(accounts.map((account) => account.property_id)),
  ];
  const [paymentResult, propertyResult] = await Promise.all([
    db
      .from("pd_payments")
      .select("account_id,amount,received_date,income_category,status")
      .in("account_id", accountIds)
      .gte("received_date", trackingStart)
      .lte("received_date", monthEnd)
      .eq("status", "posted"),
    db
      .from("pd_properties")
      .select("id,name,address,city,state,postal_code")
      .in("id", propertyIds),
  ]);
  if (paymentResult.error || propertyResult.error) {
    return { error: true };
  }

  return {
    error: false,
    payments: paymentResult.data ?? [],
    properties: propertyResult.data ?? [],
  };
}
