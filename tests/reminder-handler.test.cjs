const assert = require("node:assert/strict");
const test = require("node:test");

const handlerPromise =
  import("../supabase/functions/_shared/reminder-handler.mjs");

const account = {
  id: "account-1",
  user_id: "workspace-1",
  property_id: "property-1",
  account_type: "land_contract",
  name: "Installment account",
  party_name: "Buyer",
  party_email: "z-buyer@example.test; a-buyer@example.test",
  start_date: "2025-01-01",
  next_due_date: "2026-10-01",
  payment_amount: 550,
  payment_frequency: "monthly",
  status: "active",
};
const property = {
  id: "property-1",
  name: "Test property",
  address: "10 Main St",
  city: "Testville",
  state: "PA",
  postal_code: "00000",
};
const environment = {
  PD_REMINDER_CRON_SECRET: "cron-test-secret",
  SUPABASE_URL: "https://supabase.example.test",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-test-key",
  MAILERSEND_API_TOKEN: "mailer-test-token",
};

function request(method = "POST", secret = "cron-test-secret") {
  return new Request("https://propertydesk.example.test/reminders", {
    method,
    headers: secret ? { "x-propertydesk-cron-secret": secret } : {},
  });
}

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
        in(column, value) {
          query.filters.push(["in", column, value]);
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

function createHandler({
  env = environment,
  results = {
    pd_accounts: { data: [account], error: null },
    pd_payments: { data: [], error: null },
    pd_properties: { data: [property], error: null },
  },
  currentTime = "2026-10-31T16:00:00.000Z",
} = {}) {
  const db = fakeDb(results);
  const calls = { clients: [], claims: [], saved: [], emails: [] };
  const handlerPromiseForTest = handlerPromise.then(
    ({ createMonthEndReminderHandler }) =>
      createMonthEndReminderHandler({
        getEnv: (name) => env[name],
        createClient: (...args) => {
          calls.clients.push(args);
          return db;
        },
        now: () => new Date(currentTime),
        createLogStore: (client) => {
          assert.equal(client, db);
          return {
            recordSkipped: async (row) => calls.saved.push(row),
            claim: async (row) => {
              calls.claims.push(row);
              return `log-${calls.claims.length}`;
            },
            saveResult: async (id, values) => calls.saved.push({ id, values }),
          };
        },
        sendEmail: async (options) => {
          calls.emails.push(options);
          return {
            status: 202,
            headers: new Headers({ "x-message-id": "provider-message" }),
          };
        },
      }),
  );
  return { db, calls, handlerPromise: handlerPromiseForTest };
}

test("reminder endpoint handles preflight, methods, and cron authorization", async () => {
  const { createMonthEndReminderHandler } = await handlerPromise;
  const calls = [];
  const handler = createMonthEndReminderHandler({
    getEnv: (name) => environment[name],
    createClient: () => calls.push("client"),
  });

  assert.equal((await handler(request("OPTIONS"))).status, 204);
  assert.equal((await handler(request("GET"))).status, 405);
  assert.equal((await handler(request("POST", "wrong-secret"))).status, 401);
  assert.equal((await handler(request("POST", null))).status, 401);
  assert.deepEqual(calls, []);
});

test("reminder endpoint skips non-month-end calls before loading private records", async () => {
  const { createMonthEndReminderHandler } = await handlerPromise;
  let clientCreated = false;
  const handler = createMonthEndReminderHandler({
    getEnv: (name) => environment[name],
    createClient: () => {
      clientCreated = true;
      return {};
    },
    now: () => new Date("2026-10-30T16:00:00.000Z"),
  });

  const response = await handler(request());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    skipped: "not_last_day_of_month",
  });
  assert.equal(clientCreated, false);
});

test("reminder endpoint reports missing service configuration before creating a client", async () => {
  const { createMonthEndReminderHandler } = await handlerPromise;
  let clientCreated = false;
  const handler = createMonthEndReminderHandler({
    getEnv: (name) =>
      name === "PD_REMINDER_CRON_SECRET" ? environment[name] : undefined,
    createClient: () => {
      clientCreated = true;
      return {};
    },
    now: () => new Date("2026-10-31T16:00:00.000Z"),
  });

  const response = await handler(request());
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), {
    error: "Reminder service is not configured",
  });
  assert.equal(clientCreated, false);
});

test("reminder endpoint delivers sorted individual recipients and counts accepted emails", async () => {
  const { db, calls, handlerPromise: pending } = createHandler();
  const handler = await pending;

  const response = await handler(request());

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    month: "2026-10-01",
    accepted: 2,
    failed: 0,
    skipped: 0,
  });
  assert.deepEqual(calls.clients, [
    [
      environment.SUPABASE_URL,
      environment.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } },
    ],
  ]);
  assert.deepEqual(
    calls.emails.map(({ recipient }) => recipient),
    ["a-buyer@example.test", "z-buyer@example.test"],
  );
  assert.equal(calls.claims.length, 2);
  assert.equal(calls.claims[0].reminder_month, "2026-10-01");
  assert.equal(calls.claims[0].unpaid_due, 550);
  assert.deepEqual(
    calls.saved.map(({ values }) => values.status),
    ["accepted", "accepted"],
  );
  assert.deepEqual(
    db.queries.map(({ table }) => table),
    ["pd_accounts", "pd_payments", "pd_properties"],
  );
});

test("reminder endpoint logs and counts accounts without valid recipient addresses as skipped", async () => {
  const { calls, handlerPromise: pending } = createHandler({
    results: {
      pd_accounts: {
        data: [{ ...account, party_email: "not-an-email" }],
        error: null,
      },
      pd_payments: { data: [], error: null },
      pd_properties: { data: [property], error: null },
    },
  });
  const handler = await pending;

  const response = await handler(request());

  assert.deepEqual(await response.json(), {
    ok: true,
    month: "2026-10-01",
    accepted: 0,
    failed: 0,
    skipped: 1,
  });
  assert.deepEqual(calls.emails, []);
  assert.equal(calls.saved[0].reason, "missing_recipient_email");
  assert.equal(calls.saved[0].status, "skipped");
});
