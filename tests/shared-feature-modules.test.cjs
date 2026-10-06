const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("date, display, and money-input utilities preserve their shared contracts", () => {
  const context = vm.createContext({ window: {} });
  for (const filename of [
    "date-utils.js",
    "display-utils.js",
    "money-input-utils.js",
  ]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
      context,
    );
  }
  const dates = context.window.PropertyDeskDateUtils;
  const display = context.window.PropertyDeskDisplayUtils;
  const inputs = context.window.PropertyDeskMoneyInputUtils;

  assert.match(display.money(12), /12\.00/);
  assert.equal(display.esc(`<a x="'">&`), "&lt;a x=&quot;&#39;&quot;&gt;&amp;");
  assert.equal(inputs.moneyInput("$1,234.567"), 1234.57);
  assert.equal(inputs.moneyInput("(15.50)"), -15.5);
  assert.equal(inputs.moneyInput("not a number"), 0);
  assert.equal(display.prettyType("land_contract"), "Land contract");
  assert.equal(display.prettyKind("residential"), "Residential");
  assert.equal(display.paymentFrequencyLabel("biweekly"), "Every 2 weeks");
  assert.equal(display.paymentFrequencyLabel("unknown"), "Monthly");
  assert.equal(
    display.expenseCategoryLabel("deposit_refund"),
    "Security deposit refund",
  );
  assert.equal(
    display.expenseCategoryLabel("contractor_labor"),
    "contractor labor",
  );
  assert.equal(dates.dateOnly("2026-10-05").getDate(), 5);
  assert.equal(dates.fmtDate(null), "—");
  assert.match(dates.todayIso(), /^\d{4}-\d{2}-\d{2}$/);
  assert.match(dates.monthStart(), /^\d{4}-\d{2}-01$/);
  assert.match(dates.monthEnd(), /^\d{4}-\d{2}-\d{2}$/);
});

test("property address utilities format full and street addresses", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "property-address-utils.js"),
      "utf8",
    ),
    context,
  );
  const utils = context.window.PropertyDeskPropertyAddressUtils;

  assert.equal(
    utils.propertyAddress({
      address: "10 Main St",
      city: "Altoona",
      state: "PA",
      postal_code: "16601",
    }),
    "10 Main St, Altoona, PA, 16601",
  );
  assert.equal(
    utils.propertyLocation({ city: "Altoona", state: "PA" }),
    "Altoona, PA",
  );
  assert.equal(
    utils.streetAddress({ address: "10 Main St, Altoona, PA" }),
    "10 Main St",
  );
});

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
  assert.equal(first.client, null);
  assert.equal(first.user, null);
  assert.equal(first.properties.length, 0);
  assert.equal(first.accounts.length, 0);
  assert.equal(first.payments.length, 0);
  first.properties.push({ id: "one" });
  assert.equal(second.properties.length, 0);
});

test("backend client only initializes with complete public Supabase config", () => {
  const context = vm.createContext({ window: {} });
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

test("app services compose shared state, workspace refresh, and ledger helpers", () => {
  const received = {};
  const state = {};
  const toast = () => {};
  const fetchAll = () => {};
  const ledger = {
    accountBalance: () => {},
    scheduledMonthlyRunRate: () => {},
    collectedSince: () => {},
    depositLedger: () => {},
  };
  const config = {
    supabaseUrl: "https://example.test",
    supabaseAnonKey: "public-key",
  };
  const supabase = { createClient() {} };
  const context = vm.createContext({
    window: {
      PropertyDeskWorkspaceData: {
        create: () => ({ loadWorkspaceRecords() {} }),
      },
      PropertyDeskBackendClient: {
        create: (options) => {
          received.backend = options;
          return { configured: true };
        },
      },
      PropertyDeskAppState: { create: () => state },
      PropertyDeskNotifications: {
        create: (options) => {
          received.notifications = options;
          return { toast };
        },
      },
      PropertyDeskWorkspaceRefresh: {
        create: (options) => {
          received.refresh = options;
          return { fetchAll };
        },
      },
      PropertyDeskLedgerContext: {
        create: (options) => {
          received.ledger = options;
          return ledger;
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "app-services.js"),
      "utf8",
    ),
    context,
  );
  const dependencies = {
    $() {},
    render() {},
    todayIso() {},
    scheduledLoanBalance() {},
    monthlyScheduledEstimate() {},
    sumPosted() {},
    securityDepositBalance() {},
    config,
    supabase,
  };
  const services = context.window.PropertyDeskAppServices.create(dependencies);

  assert.equal(received.backend.config, config);
  assert.equal(received.backend.supabase, supabase);
  assert.equal(received.notifications.$, dependencies.$);
  assert.equal(received.refresh.state, state);
  assert.equal(received.refresh.toast, toast);
  assert.equal(received.refresh.render, dependencies.render);
  assert.equal(received.ledger.state, state);
  assert.equal(received.ledger.todayIso, dependencies.todayIso);
  assert.equal(
    received.ledger.scheduledLoanBalance,
    dependencies.scheduledLoanBalance,
  );
  assert.equal(services.backend.configured, true);
  assert.equal(services.state, state);
  assert.equal(services.toast, toast);
  assert.equal(services.fetchAll, fetchAll);
  assert.equal(services.depositLedger, ledger.depositLedger);
  assert.deepEqual(
    Object.keys(services).sort(),
    [
      "accountBalance",
      "backend",
      "collectedSince",
      "depositLedger",
      "fetchAll",
      "scheduledMonthlyRunRate",
      "state",
      "toast",
    ].sort(),
  );
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

test("PWA registration runs only in a web context and reports registration failures", async () => {
  const context = vm.createContext({ window: {}, navigator: {}, console });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "pwa-registration.js"),
      "utf8",
    ),
    context,
  );
  const registerShell = context.window.PropertyDeskPwa.registerShell;
  const registrations = [];
  const warnings = [];
  const serviceWorker = {
    register(pathname) {
      registrations.push(pathname);
      return Promise.resolve();
    },
  };

  registerShell({
    navigatorRef: {},
    windowRef: { location: { protocol: "https:" } },
    logger: { warn: (...args) => warnings.push(args) },
  });
  registerShell({
    navigatorRef: { serviceWorker },
    windowRef: { location: { protocol: "file:" } },
    logger: { warn: (...args) => warnings.push(args) },
  });
  registerShell({
    navigatorRef: { serviceWorker },
    windowRef: { location: { protocol: "https:" } },
    logger: { warn: (...args) => warnings.push(args) },
  });
  assert.deepEqual(registrations, ["./sw.js"]);

  const failure = new Error("Registration failed");
  registerShell({
    navigatorRef: {
      serviceWorker: { register: () => Promise.reject(failure) },
    },
    windowRef: { location: { protocol: "https:" } },
    logger: { warn: (...args) => warnings.push(args) },
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(warnings.length, 1);
  assert.deepEqual(warnings[0], [
    "PropertyDesk shell cache could not be registered:",
    failure,
  ]);
});

test("ledger context scopes balance, collections, and deposits to workspace state", () => {
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
  const depositEntries = [
    { account_id: "a1", amount: 40 },
    { account_id: "a2", amount: 90 },
  ];
  const expenses = [{ account_id: "a1", amount: 5 }];
  const calls = [];
  const ledger = context.window.PropertyDeskLedgerContext.create({
    state: { accounts, payments, depositEntries, expenses },
    todayIso: () => "2026-10-04",
    scheduledLoanBalance: (account, date) => {
      calls.push(["balance", account.id, date]);
      return account.id === "a1" ? 500 : 300;
    },
    monthlyScheduledEstimate: (rows) => rows.length * 600,
    sumPosted: (rows) => rows.reduce((sum, row) => sum + row.amount, 0),
    securityDepositBalance: (entries) => ({
      active: entries,
      totals: { held: entries.reduce((sum, row) => sum + row.amount, 0) },
    }),
  });

  assert.equal(ledger.accountBalance(accounts[0]), 500);
  assert.equal(ledger.accountBalance(accounts[0], "2026-08-01"), 500);
  assert.equal(ledger.scheduledMonthlyRunRate(), 1200);
  assert.equal(ledger.collectedSince("2026-10-01"), 20);
  const deposit = ledger.depositLedger("a1");
  assert.equal(deposit.entries.length, 1);
  assert.equal(deposit.entries[0], depositEntries[0]);
  assert.deepEqual(
    Object.keys(deposit).sort(),
    ["active", "entries", "totals"].sort(),
  );
  assert.equal(deposit.active.length, 1);
  assert.equal(deposit.totals.held, 40);
  assert.deepEqual(calls, [
    ["balance", "a1", "2026-10-04"],
    ["balance", "a1", "2026-08-01"],
  ]);
});

test("backup and report exports own separate button bindings", () => {
  for (const [file, globalName, expected] of [
    ["backup-export.js", "PropertyDeskBackupExport", ["export-all:click"]],
    ["report-export.js", "PropertyDeskReportExport", ["export-report:click"]],
  ]) {
    const context = vm.createContext({ window: {} });
    vm.runInContext(
      fs.readFileSync(
        path.join(__dirname, "..", "features", "download-utils.js"),
        "utf8",
      ),
      context,
    );
    if (file === "backup-export.js") {
      for (const dependency of [
        "backup-records.js",
        "backup-agreement-files.js",
      ]) {
        vm.runInContext(
          fs.readFileSync(
            path.join(__dirname, "..", "features", dependency),
            "utf8",
          ),
          context,
        );
      }
    }
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", file), "utf8"),
      context,
    );
    const bindings = new Map();
    const feature = context.window[globalName].create({
      $: (id) => ({
        addEventListener: (event, handler) =>
          bindings.set(`${id}:${event}`, handler),
      }),
    });

    feature.attachEvents();

    assert.deepEqual([...bindings.keys()], expected);
    assert.ok(
      [...bindings.values()].every((handler) => typeof handler === "function"),
    );
  }
});

test("report workflow composes portfolio rendering and account export actions", () => {
  const passed = {};
  const context = vm.createContext({
    window: {
      PropertyDeskReportModel: {
        create: (options) => {
          passed.model = options;
          return { buildReportModel: () => ({ income: 0 }) };
        },
      },
      PropertyDeskReportViews: {
        create: (options) => {
          passed.view = options;
          return { renderReports: () => "reports" };
        },
      },
      PropertyDeskReportExport: {
        create: (options) => {
          passed.export = options;
          return { attachEvents: () => "export events" };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "report-workflow.js"),
      "utf8",
    ),
    context,
  );
  const accountBalance = () => 0;
  const dateOnly = () => null;
  const sumIncome = () => 0;
  const sumOperatingExpenses = () => 0;
  const state = {};
  const workflow = context.window.PropertyDeskReportWorkflow.create({
    state,
    dateOnly,
    sumIncome,
    sumOperatingExpenses,
    accountBalance,
  });

  assert.equal(passed.model.accountBalance, accountBalance);
  assert.equal(passed.model.state, state);
  assert.equal(typeof passed.view.buildReportModel, "function");
  assert.equal(passed.export.accountBalance, accountBalance);
  assert.equal(workflow.renderReports(), "reports");
  assert.equal(workflow.attachReportExportEvents(), "export events");
});

test("account CSV export keeps rental balances blank and escapes spreadsheet fields", async () => {
  const context = vm.createContext({ window: {}, Blob });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "download-utils.js"),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "report-export.js"),
      "utf8",
    ),
    context,
  );
  const downloads = [];
  let exportClick;
  const feature = context.window.PropertyDeskReportExport.create({
    $: (id) => {
      assert.equal(id, "export-report");
      return {
        addEventListener(eventName, handler) {
          assert.equal(eventName, "click");
          exportClick = handler;
        },
      };
    },
    state: {
      properties: [{ id: "property-1", name: "Main House, East" }],
      accounts: [
        {
          id: "rental-1",
          property_id: "property-1",
          name: "Lease",
          account_type: "rental",
          party_name: "Tenant",
          payment_amount: 825,
          next_due_date: "2026-11-01",
          status: "active",
        },
        {
          id: "note-1",
          property_id: "property-1",
          name: "Seller note",
          account_type: "note",
          party_name: "Buyer",
          payment_amount: 400,
          next_due_date: "2026-11-01",
          status: "active",
        },
      ],
    },
    todayIso: () => "2026-10-05",
    prettyType: (type) => type,
    accountBalance: (account) => (account.id === "note-1" ? 12000 : 0),
    downloadBlob: (blob, filename) => downloads.push({ blob, filename }),
  });

  assert.deepEqual(Object.keys(feature), ["attachEvents"]);
  feature.attachEvents();
  exportClick();

  assert.equal(downloads[0].filename, "propertydesk-accounts-2026-10-05.csv");
  assert.equal(
    await downloads[0].blob.text(),
    [
      "account_name,account_type,property,party,monthly_due,estimated_on_time_loan_balance,next_due_date,status",
      'Lease,rental,"Main House, East",Tenant,825,,2026-11-01,active',
      'Seller note,note,"Main House, East",Buyer,400,12000,2026-11-01,active',
    ].join("\r\n"),
  );
});
