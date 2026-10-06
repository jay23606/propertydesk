export function createReminderLogStore(db, now = () => new Date()) {
  async function claim(row) {
    const key = {
      account_id: row.account_id,
      reminder_month: row.reminder_month,
      recipient_index: row.recipient_index,
    };
    const { data: retry } = await db
      .from("pd_reminder_logs")
      .update({
        status: "sending",
        reason: null,
        unpaid_due: row.unpaid_due,
        provider_message_id: null,
        attempted_at: now().toISOString(),
        completed_at: null,
      })
      .match(key)
      .eq("status", "failed")
      .select("id")
      .maybeSingle();
    if (retry?.id) return retry.id;

    const { data, error } = await db
      .from("pd_reminder_logs")
      .insert({ ...row, status: "sending" })
      .select("id")
      .single();
    if (error?.code === "23505") return null;
    if (error) throw error;
    return data.id;
  }

  async function recordSkipped(row) {
    const { error } = await db.from("pd_reminder_logs").upsert(row, {
      onConflict: "account_id,reminder_month,recipient_index",
      ignoreDuplicates: true,
    });
    if (error) throw error;
  }

  async function saveResult(id, values) {
    const { error } = await db
      .from("pd_reminder_logs")
      .update({ ...values, completed_at: now().toISOString() })
      .eq("id", id);
    if (error) throw error;
  }

  return { claim, recordSkipped, saveResult };
}
