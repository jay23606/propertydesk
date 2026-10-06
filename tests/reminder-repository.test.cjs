const assert = require("node:assert/strict");
const test = require("node:test");

const repositoryPromise =
  import("../supabase/functions/_shared/reminder-repository.mjs");

function fakeDb(results) {
  const queries = [];
  return {
    queries,
    from(table) {
      const query = { table, filters: [] };
      queries.push(query);
      const builder = {
        select(columns) {
          query.columns = columns;
          return builder;
        },
        eq(column, value) {
          query.filters.push(["eq", column, value]);
          return builder;
        },
        in(column, values) {
          query.filters.push(["in", column, values]);
          return builder;
        },
        gte(column, value) {
          query.filters.push(["gte", column, value]);
          return builder;
        },
        lte(column, value) {
          query.filters.push(["lte", column, value]);
          return builder;
        },
        then(resolve, reject) {
          return Promise.resolve(results[table]).then(resolve, reject);
        },
      };
      return builder;
    },
  };
}

test("reminder repository loads only active accounts with reminders enabled", async () => {
  const { loadEnabledReminderAccounts } = await repositoryPromise;
  const result = { data: [{ id: "account-1" }], error: null };
  const db = fakeDb({ pd_accounts: result });

  assert.equal(await loadEnabledReminderAccounts(db), result);
  assert.deepEqual(db.queries, [
    {
      table: "pd_accounts",
      columns:
        "id,user_id,property_id,account_type,name,party_name,party_email,start_date,next_due_date,payment_amount,payment_frequency,status",
      filters: [
        ["eq", "monthly_reminder_enabled", true],
        ["eq", "status", "active"],
      ],
    },
  ]);
});

test("reminder repository bounds posted payments and deduplicates property reads", async () => {
  const { loadReminderRecords } = await repositoryPromise;
  const payments = { data: [{ account_id: "account-1" }], error: null };
  const properties = { data: [{ id: "property-1" }], error: null };
  const db = fakeDb({ pd_payments: payments, pd_properties: properties });
  const result = await loadReminderRecords(
    db,
    [
      { id: "account-1", property_id: "property-1" },
      { id: "account-2", property_id: "property-1" },
      { id: "account-3", property_id: "property-2" },
    ],
    "2026-10-31",
    "2026-10-01",
  );

  assert.deepEqual(result, {
    error: false,
    payments: payments.data,
    properties: properties.data,
  });
  assert.deepEqual(db.queries, [
    {
      table: "pd_payments",
      columns: "account_id,amount,received_date,income_category,status",
      filters: [
        ["in", "account_id", ["account-1", "account-2", "account-3"]],
        ["gte", "received_date", "2026-10-01"],
        ["lte", "received_date", "2026-10-31"],
        ["eq", "status", "posted"],
      ],
    },
    {
      table: "pd_properties",
      columns: "id,name,address,city,state,postal_code",
      filters: [["in", "id", ["property-1", "property-2"]]],
    },
  ]);
});

test("reminder repository reports payment or property query errors", async () => {
  const { loadReminderRecords } = await repositoryPromise;
  const db = fakeDb({
    pd_payments: { data: null, error: { message: "payment query failed" } },
    pd_properties: { data: [], error: null },
  });

  assert.deepEqual(
    await loadReminderRecords(
      db,
      [{ id: "account-1", property_id: "property-1" }],
      "2026-10-31",
      "2026-10-01",
    ),
    { error: true },
  );
});
