const assert = require("node:assert/strict");
const test = require("node:test");

const storePromise = import("../supabase/functions/_shared/reminder-log.mjs");

function fakeDb(results = {}) {
  const calls = [];

  function query(table) {
    const builder = {
      update(values) {
        calls.push({ table, operation: "update", values });
        return builder;
      },
      insert(values) {
        calls.push({ table, operation: "insert", values });
        return builder;
      },
      upsert(values, options) {
        calls.push({ table, operation: "upsert", values, options });
        return Promise.resolve(results.upsert || { error: null });
      },
      match(values) {
        calls.push({ table, operation: "match", values });
        return builder;
      },
      eq(column, value) {
        calls.push({ table, operation: "eq", column, value });
        return builder;
      },
      select(columns) {
        calls.push({ table, operation: "select", columns });
        return builder;
      },
      maybeSingle() {
        return Promise.resolve(results.maybeSingle || { data: null });
      },
      single() {
        return Promise.resolve(results.single || { data: { id: "log-new" } });
      },
      then(resolve, reject) {
        return Promise.resolve(results.update || { error: null }).then(
          resolve,
          reject,
        );
      },
    };
    return builder;
  }

  return { db: { from: query }, calls };
}

const fixedNow = () => new Date("2026-10-31T12:00:00.000Z");

test("reminder log store retries a failed recipient claim in place", async () => {
  const { createReminderLogStore } = await storePromise;
  const { db, calls } = fakeDb({ maybeSingle: { data: { id: "log-retry" } } });
  const store = createReminderLogStore(db, fixedNow);
  const id = await store.claim({
    account_id: "account-1",
    reminder_month: "2026-10-01",
    recipient_index: 2,
    unpaid_due: 550,
  });

  assert.equal(id, "log-retry");
  assert.deepEqual(calls[0], {
    table: "pd_reminder_logs",
    operation: "update",
    values: {
      status: "sending",
      reason: null,
      unpaid_due: 550,
      provider_message_id: null,
      attempted_at: "2026-10-31T12:00:00.000Z",
      completed_at: null,
    },
  });
  assert.deepEqual(calls[1], {
    table: "pd_reminder_logs",
    operation: "match",
    values: {
      account_id: "account-1",
      reminder_month: "2026-10-01",
      recipient_index: 2,
    },
  });
  assert.equal(
    calls.some((call) => call.operation === "insert"),
    false,
  );
});

test("reminder log store creates one claim and treats duplicate claims as already handled", async () => {
  const { createReminderLogStore } = await storePromise;
  const row = {
    account_id: "account-1",
    reminder_month: "2026-10-01",
    recipient_index: 1,
    status: "sending",
    unpaid_due: 550,
  };
  const created = fakeDb({
    maybeSingle: { data: null },
    single: { data: { id: "log-new" }, error: null },
  });
  const store = createReminderLogStore(created.db, fixedNow);
  assert.equal(await store.claim(row), "log-new");
  assert.deepEqual(
    created.calls.find((call) => call.operation === "insert").values,
    row,
  );

  const duplicate = fakeDb({
    maybeSingle: { data: null },
    single: { data: null, error: { code: "23505" } },
  });
  assert.equal(
    await createReminderLogStore(duplicate.db, fixedNow).claim(row),
    null,
  );
});

test("reminder log store upserts skipped recipients and timestamps delivery results", async () => {
  const { createReminderLogStore } = await storePromise;
  const { db, calls } = fakeDb();
  const store = createReminderLogStore(db, fixedNow);
  const skipped = {
    account_id: "account-1",
    reminder_month: "2026-10-01",
    recipient_index: 0,
    status: "skipped",
    reason: "missing_recipient_email",
  };

  await store.recordSkipped(skipped);
  await store.saveResult("log-1", { status: "accepted", reason: null });

  assert.deepEqual(calls[0], {
    table: "pd_reminder_logs",
    operation: "upsert",
    values: skipped,
    options: {
      onConflict: "account_id,reminder_month,recipient_index",
      ignoreDuplicates: true,
    },
  });
  assert.equal(calls[1].operation, "update");
  assert.deepEqual(calls[1].values, {
    status: "accepted",
    reason: null,
    completed_at: "2026-10-31T12:00:00.000Z",
  });
  assert.deepEqual(calls[2], {
    table: "pd_reminder_logs",
    operation: "eq",
    column: "id",
    value: "log-1",
  });
});
