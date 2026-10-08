const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("app state starts in Properties with fresh workspace collections", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "app-state.js"),
      "utf8",
    ),
    context,
  );
  const first = context.window.PropertyDeskAppState.create();
  const second = context.window.PropertyDeskAppState.create();

  assert.equal(first.view, "properties");
  assert.equal(Object.hasOwn(first, "client"), false);
  assert.equal(first.user, null);
  assert.equal(first.properties.length, 0);
  assert.equal(first.accounts.length, 0);
  assert.equal(first.payments.length, 0);
  first.properties.push({ id: "one" });
  assert.equal(second.properties.length, 0);
});

test("backend client only initializes with complete explicit Supabase dependencies", () => {
  const context = vm.createContext({
    window: {
      supabase: {
        createClient() {
          return { connected: true };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "backend-client.js"),
      "utf8",
    ),
    context,
  );
  let captured;
  const supabase = {
    createClient(...args) {
      captured = args;
      return { connected: true };
    },
  };
  const implicit = context.window.PropertyDeskBackendClient.create({
    config: {
      supabaseUrl: "https://example.test",
      supabaseAnonKey: "public-anon-key",
    },
  });
  assert.equal(implicit.configured, false);
  assert.equal(implicit.createClient(), null);

  const incomplete = context.window.PropertyDeskBackendClient.create({
    config: { supabaseUrl: "https://example.test" },
    supabase,
  });
  assert.equal(incomplete.configured, false);
  assert.equal(incomplete.createClient(), null);
  assert.equal(captured, undefined);

  const backend = context.window.PropertyDeskBackendClient.create({
    config: {
      supabaseUrl: "https://example.test",
      supabaseAnonKey: "public-anon-key",
    },
    supabase,
  });
  assert.equal(backend.configured, true);
  assert.deepEqual(backend.createClient(), { connected: true });
  assert.equal(captured[0], "https://example.test");
  assert.equal(captured[1], "public-anon-key");
  assert.deepEqual(JSON.parse(JSON.stringify(captured[2])), {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
});

test("notification feature replaces its timer and hides transient feedback", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "notifications.js"),
      "utf8",
    ),
    context,
  );
  const classes = new Set();
  const element = {
    textContent: "",
    classList: {
      add: (value) => classes.add(value),
      remove: (value) => classes.delete(value),
    },
  };
  const cleared = [];
  const timers = [];
  const { toast } = context.window.PropertyDeskNotifications.create({
    $: (id) => {
      assert.equal(id, "toast");
      return element;
    },
    delayMs: 2500,
    setTimeoutFn: (callback, delay) => {
      const timer = { callback, delay };
      timers.push(timer);
      return timer;
    },
    clearTimeoutFn: (timer) => {
      if (timer) timer.cancelled = true;
      cleared.push(timer);
    },
  });

  toast("Saved");
  const firstTimer = timers[0];
  toast("Updated");

  assert.equal(element.textContent, "Updated");
  assert.equal(classes.has("show"), true);
  assert.deepEqual(cleared, [null, firstTimer]);
  assert.equal(timers[0].delay, 2500);
  assert.equal(timers[1].delay, 2500);
  if (!timers[0].cancelled) timers[0].callback();
  assert.equal(classes.has("show"), true);
  if (!timers[1].cancelled) timers[1].callback();
  assert.equal(classes.has("show"), false);
  toast("Visible again");
  if (!timers[2].cancelled) timers[2].callback();
  assert.equal(classes.has("show"), false);
});

test("ledger context scopes balances and collections to workspace state", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "ledger-context.js"),
      "utf8",
    ),
    context,
  );
  const accounts = [{ id: "a1" }, { id: "a2" }];
  const payments = [
    { account_id: "a1", received_date: "2026-10-01", amount: 20 },
    { account_id: "a1", received_date: "2026-09-30", amount: 100 },
  ];
  const calls = [];
  const ledger = context.window.PropertyDeskLedgerContext.create({
    state: { accounts, payments },
    todayIso: () => "2026-10-04",
    scheduledLoanBalance: (account, date) => {
      calls.push(["balance", account.id, date]);
      return account.id === "a1" ? 500 : 300;
    },
    monthlyScheduledEstimate: (rows) => rows.length * 600,
    postedOnOrAfter: (rows, field, start) =>
      rows.filter(
        (row) =>
          (!row.status || row.status === "posted") &&
          String(row[field]) >= start,
      ),
    sumPosted: (rows) => rows.reduce((sum, row) => sum + row.amount, 0),
  });

  assert.equal(ledger.accountBalance(accounts[0]), 500);
  assert.equal(ledger.accountBalance(accounts[0], "2026-08-01"), 500);
  assert.equal(ledger.scheduledMonthlyRunRate(), 1200);
  assert.equal(ledger.collectedSince("2026-10-01"), 20);
  assert.deepEqual(Object.keys(ledger).sort(), [
    "accountBalance",
    "collectedSince",
    "scheduledMonthlyRunRate",
  ]);
  assert.deepEqual(calls, [
    ["balance", "a1", "2026-10-04"],
    ["balance", "a1", "2026-08-01"],
  ]);
});

test("deposit context scopes held-balance calculations to the selected account", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "deposit-context.js"),
      "utf8",
    ),
    context,
  );
  const depositEntries = [
    { account_id: "a1", amount: 40 },
    { account_id: "a2", amount: 90 },
  ];
  const payments = [{ id: "p1" }];
  const expenses = [{ id: "e1" }];
  const passed = {};
  const depositContext = context.window.PropertyDeskDepositContext.create({
    state: { depositEntries, payments, expenses },
    securityDepositBalance(entries, passedPayments, passedExpenses) {
      passed.entries = entries;
      passed.payments = passedPayments;
      passed.expenses = passedExpenses;
      return {
        active: entries,
        totals: { held: entries.reduce((sum, row) => sum + row.amount, 0) },
        paymentById: new Map(passedPayments.map((row) => [row.id, row])),
        expenseById: new Map(passedExpenses.map((row) => [row.id, row])),
      };
    },
  });
  assert.equal(Object.isFrozen(depositContext), true);
  const deposit = depositContext.depositLedger("a1");

  assert.equal(deposit.entries.length, 1);
  assert.equal(deposit.entries[0], depositEntries[0]);
  assert.deepEqual(
    Object.keys(deposit).sort(),
    ["active", "entries", "expenseById", "paymentById", "totals"].sort(),
  );
  assert.equal(deposit.active.length, 1);
  assert.equal(deposit.totals.held, 40);
  assert.equal(passed.entries[0], depositEntries[0]);
  assert.equal(passed.payments, payments);
  assert.equal(passed.expenses, expenses);
});
