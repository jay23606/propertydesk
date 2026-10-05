const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");

test("CSV import feature loads as an isolated browser module", () => {
  const validators = Object.freeze({ validateAccountRows() {} });
  const context = vm.createContext({
    window: { PropertyDeskImportWorkflows: validators },
  });
  const source = fs.readFileSync(
    path.join(__dirname, "..", "features", "imports.js"),
    "utf8",
  );

  vm.runInContext(source, context);

  assert.equal(context.window.PropertyDeskImportWorkflows, validators);
  const feature = context.window.PropertyDeskImportFeature.create({});
  assert.equal(typeof feature.attachEvents, "function");
  assert.equal(typeof feature.importAccounts, "function");
  assert.equal(typeof feature.importExpenses, "function");
  assert.equal(typeof feature.importPayments, "function");
});

test("shared app utilities preserve formatting, addresses, labels, and money input", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", "app-utils.js"), "utf8"),
    context,
  );
  const utils = context.window.PropertyDeskAppUtils;

  assert.equal(utils.esc(`<a x="'">&`), "&lt;a x=&quot;&#39;&quot;&gt;&amp;");
  assert.equal(utils.moneyInput("$1,234.567"), 1234.57);
  assert.equal(utils.moneyInput("(15.50)"), -15.5);
  assert.equal(utils.moneyInput("not a number"), 0);
  assert.equal(utils.prettyType("land_contract"), "Land contract");
  assert.equal(utils.prettyKind("residential"), "Residential");
  assert.equal(utils.paymentFrequencyLabel("biweekly"), "Every 2 weeks");
  assert.equal(utils.paymentFrequencyLabel("unknown"), "Monthly");
  assert.equal(utils.expenseCategoryLabel("deposit_refund"), "Security deposit refund");
  assert.equal(utils.expenseCategoryLabel("contractor_labor"), "contractor labor");
  assert.equal(
    utils.propertyAddress({ address: "10 Main St", city: "Altoona", state: "PA", postal_code: "16601" }),
    "10 Main St, Altoona, PA, 16601",
  );
  assert.equal(utils.streetAddress({ address: "10 Main St, Altoona, PA" }), "10 Main St");
  assert.match(utils.todayIso(), /^\d{4}-\d{2}-\d{2}$/);
  assert.match(utils.monthStart(), /^\d{4}-\d{2}-01$/);
  assert.match(utils.monthEnd(), /^\d{4}-\d{2}-\d{2}$/);
});

test("notification feature replaces its timer and hides transient feedback", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", "notifications.js"), "utf8"),
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
    fs.readFileSync(path.join(__dirname, "..", "features", "pwa-registration.js"), "utf8"),
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
    fs.readFileSync(path.join(__dirname, "..", "features", "ledger-context.js"), "utf8"),
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
    securityDepositBalance: (entries, paid, costs) => ({
      held: entries.reduce((sum, row) => sum + row.amount, 0),
      paymentCount: paid.length,
      expenseCount: costs.length,
    }),
  });

  assert.equal(ledger.accountBalance(accounts[0]), 500);
  assert.equal(ledger.accountBalance(accounts[0], "2026-08-01"), 500);
  assert.equal(ledger.scheduledMonthlyRunRate(), 1200);
  assert.equal(ledger.collectedSince("2026-10-01"), 20);
  const deposit = ledger.depositLedger("a1");
  assert.equal(deposit.held, 40);
  assert.equal(deposit.paymentCount, 2);
  assert.equal(deposit.expenseCount, 1);
  assert.equal(deposit.entries.length, 1);
  assert.equal(deposit.entries[0], depositEntries[0]);
  assert.deepEqual(calls, [
    ["balance", "a1", "2026-10-04"],
    ["balance", "a1", "2026-08-01"],
  ]);
});

test("export feature owns backup and report button bindings", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", "exports.js"), "utf8"),
    context,
  );
  const bindings = new Map();
  const feature = context.window.PropertyDeskExports.create({
    $: (id) => ({
      addEventListener: (event, handler) => bindings.set(`${id}:${event}`, handler),
    }),
  });

  feature.attachEvents();

  assert.deepEqual([...bindings.keys()], ["export-all:click", "export-report:click"]);
  assert.ok([...bindings.values()].every((handler) => typeof handler === "function"));
});

test("property and account detail modules expose separate workflows", () => {
  const context = vm.createContext({ window: {} });
  for (const filename of ["property-details.js", "account-details.js"]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
      context,
    );
  }

  const property = context.window.PropertyDeskPropertyDetails.create({});
  const account = context.window.PropertyDeskAccountDetails.create({});
  assert.equal(typeof property.openPropertyDetails, "function");
  assert.equal(typeof property.attachPropertyEvents, "function");
  assert.equal(typeof account.openAccountDetails, "function");
});

test("delegated action router preserves action routing and event propagation", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", "action-router.js"), "utf8"),
    context,
  );
  const listeners = new Map();
  const calls = [];
  const propertyField = { value: "" };
  const callbacks = [
    "recordDepositAdjustment", "removeWorkspaceMember", "savePropertyHolders",
    "openPayment", "resetAccountForm", "populateFormOptions", "openModal",
    "editPropertyQuickNote", "openPropertyDetails", "openPropertyPayment",
    "deletePropertyDocument", "openPropertyDocument", "correctTransaction",
    "voidTransaction", "closeModal", "openAccountDetails",
    "uploadPropertyDocument",
  ];
  const contextValues = Object.fromEntries(
    callbacks.map((name) => [name, (...args) => calls.push([name, ...args])]),
  );
  const feature = context.window.PropertyDeskActionRouter.create({
    ...contextValues,
    $: (id) => id === "account-property" ? propertyField : { id },
    documentRef: {
      addEventListener: (name, handler) => listeners.set(name, handler),
    },
  });
  feature.attachEvents();

  function dispatchClick(selector, dataset, otherActions = {}) {
    let prevented = 0;
    let stopped = 0;
    const actions = new Map(Object.entries(otherActions));
    actions.set(selector, { dataset });
    listeners.get("click")({
      target: { closest: (value) => actions.get(value) || null },
      preventDefault: () => { prevented += 1; },
      stopPropagation: () => { stopped += 1; },
    });
    return { prevented, stopped };
  }

  dispatchClick("[data-deposit-adjustment]", {
    accountId: "rental-1", depositAdjustment: "retained",
  });
  dispatchClick("[data-remove-member]", { removeMember: "member-1" });
  dispatchClick("[data-save-holders]");
  assert.deepEqual(
    dispatchClick(
      "[data-account-payment]",
      { accountPayment: "account-1" },
      { "[data-property-card]": { dataset: { propertyCard: "should-not-open" } } },
    ),
    { prevented: 1, stopped: 1 },
  );
  dispatchClick("[data-property-account]", { propertyAccount: "property-1" });
  dispatchClick("[data-property-note]", { propertyNote: "property-1" });
  dispatchClick("[data-property-open]", { propertyOpen: "property-1" });
  dispatchClick("[data-property-payment]", { propertyPayment: "property-1" });
  dispatchClick("[data-delete-document]", { deleteDocument: "doc-1" });
  dispatchClick("[data-open-document]", { openDocument: "doc-1" });
  dispatchClick("[data-correct-transaction]", { kind: "income", id: "pay-1" });
  dispatchClick("[data-void-transaction]", { kind: "expense", id: "exp-1" });
  dispatchClick("[data-detail]", { detail: "account-1" });
  dispatchClick("[data-property-card]", { propertyCard: "property-2" });
  const file = { matches: (selector) => selector === "[data-property-document]" };
  listeners.get("change")({ target: file });

  assert.equal(propertyField.value, "property-1");
  assert.deepEqual(calls, [
    ["recordDepositAdjustment", "rental-1", "retained"],
    ["removeWorkspaceMember", "member-1"],
    ["savePropertyHolders"],
    ["openPayment", "account-1"],
    ["resetAccountForm"],
    ["populateFormOptions"],
    ["openModal", "account-modal"],
    ["editPropertyQuickNote", "property-1"],
    ["openPropertyDetails", "property-1"],
    ["openPropertyPayment", "property-1"],
    ["deletePropertyDocument", "doc-1"],
    ["openPropertyDocument", "doc-1"],
    ["correctTransaction", "income", "pay-1"],
    ["voidTransaction", "expense", "exp-1"],
    ["closeModal", { id: "property-detail-modal" }],
    ["openAccountDetails", "account-1"],
    ["openPropertyDetails", "property-2"],
    ["uploadPropertyDocument", file],
  ]);
});

test("property and transaction views own their search and filter bindings", () => {
  for (const [file, globalName, expected] of [
    ["property-views.js", "PropertyDeskPropertyViews", [
      "property-search:input",
      "property-filter:change",
      "property-holder-filter:change",
      "show-archived:change",
    ]],
    ["transaction-views.js", "PropertyDeskTransactionViews", [
      "payment-search:input",
      "payment-period:change",
      "transaction-type:change",
    ]],
  ]) {
    const context = vm.createContext({ window: {} });
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", file), "utf8"),
      context,
    );
    const handlers = new Map();
    const feature = context.window[globalName].create({
      $: (id) => ({
        addEventListener: (event, handler) =>
          handlers.set(`${id}:${event}`, handler),
      }),
    });

    assert.equal(typeof feature.attachEvents, "function");
    feature.attachEvents();
    assert.deepEqual([...handlers.keys()], expected);
    assert.ok([...handlers.values()].every((handler) => typeof handler === "function"));
  }
});

test("property detail feature owns its editing and quick-action event bindings", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", "property-details.js"), "utf8"),
    context,
  );
  const handlers = new Map();
  const elements = new Map();
  const calls = [];
  const getElement = (id) => {
    if (!elements.has(id)) {
      elements.set(id, {
        id,
        value: "",
        addEventListener(event, handler) {
          handlers.set(`${id}:${event}`, handler);
        },
      });
    }
    return elements.get(id);
  };
  const propertyModal = getElement("property-detail-modal");
  const feature = context.window.PropertyDeskPropertyDetails.create({
    $: getElement,
    state: {
      selectedPropertyId: "property-1",
      accounts: [{ id: "account-1" }],
    },
    closeModal: (modal) => calls.push(`close:${modal.id}`),
    editAccount: (account) => calls.push(`edit:${account.id}`),
    openPayment: (...args) => calls.push(`payment:${args.join(":")}`),
    openExpense: (propertyId) => calls.push(`expense:${propertyId}`),
    resetAccountForm: () => calls.push("reset-account"),
    populateFormOptions: () => calls.push("populate-options"),
    openModal: (id) => calls.push(`open:${id}`),
  });

  feature.attachPropertyEvents(() => calls.push("archive"));
  handlers.get("property-detail-content:click")({
    target: {
      closest: (selector) =>
        selector === "[data-edit-account]"
          ? { dataset: { editAccount: "account-1" } }
          : null,
    },
    preventDefault() {},
  });
  handlers.get("property-detail-add-income:click")();
  handlers.get("property-detail-add-expense:click")();
  handlers.get("property-detail-add-account:click")();
  handlers.get("property-archive-toggle:click")();

  assert.equal(propertyModal.id, "property-detail-modal");
  assert.equal(getElement("account-property").value, "property-1");
  assert.deepEqual(calls, [
    "close:property-detail-modal",
    "edit:account-1",
    "close:property-detail-modal",
    "payment::property-1",
    "close:property-detail-modal",
    "expense:property-1",
    "close:property-detail-modal",
    "reset-account",
    "populate-options",
    "open:account-modal",
    "archive",
  ]);
});

test("app coordinator passes the amortization helper into account details", () => {
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  assert.match(
    app,
    /amortizationSchedule,[\s\S]*?\} = window\.PropertyDeskLedgerUtils;/,
  );
  assert.match(
    app,
    /PropertyDeskAccountDetails\.create\(\{[\s\S]*?amortizationSchedule,/,
  );
  assert.match(
    app,
    /correctTransaction,[\s\S]*?=\s*window\.PropertyDeskTransactionMaintenance\.create/,
  );
  assert.match(
    app,
    /PropertyDeskTransactionMaintenance\.create\(\{[\s\S]*?updateAllocationPreview/,
  );
});

test("app coordinator delegates transient notices to the notification feature", () => {
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  assert.match(app, /PropertyDeskNotifications\.create\(\{\s*\$\s*\}\)/);
  assert.doesNotMatch(app, /toastTimer|function toast\(/);
});

test("service worker caches a cloned shell response within the fetch lifetime", async () => {
  let fetchHandler;
  let eventDispatchFinished = false;
  let waitUntilPromise;
  let responsePromise;
  let cachedBody = "";
  let cachedKey;
  const self = {
    registration: { scope: "https://propertydesk.test/" },
    location: { origin: "https://propertydesk.test" },
    addEventListener(type, handler) {
      if (type === "fetch") fetchHandler = handler;
    },
  };
  const caches = {
    async open() {
      return {
        async put(key, response) {
          cachedKey = key.url || key;
          cachedBody = await response.text();
        },
      };
    },
    async match() {
      return null;
    },
  };
  const context = vm.createContext({
    self,
    caches,
    URL,
    Response,
    fetch: async () => new Response("shell asset"),
  });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8"),
    context,
  );

  fetchHandler({
    request: {
      method: "GET",
      mode: "cors",
      url: "https://propertydesk.test/app.js",
    },
    waitUntil(promise) {
      assert.equal(
        eventDispatchFinished,
        false,
        "waitUntil must be called during fetch dispatch",
      );
      waitUntilPromise = promise;
    },
    respondWith(promise) {
      responsePromise = promise;
    },
  });
  eventDispatchFinished = true;

  const response = await responsePromise;
  await waitUntilPromise;
  assert.equal(await response.text(), "shell asset");
  assert.equal(cachedBody, "shell asset");
  assert.equal(cachedKey, "https://propertydesk.test/app.js");
});

test("service worker falls back to the cached app shell for offline navigation", async () => {
  let fetchHandler;
  let responsePromise;
  let matchedKey;
  const self = {
    registration: { scope: "https://propertydesk.test/" },
    location: { origin: "https://propertydesk.test" },
    addEventListener(type, handler) {
      if (type === "fetch") fetchHandler = handler;
    },
  };
  const caches = {
    async open() {
      return { async put() {} };
    },
    async match(key) {
      matchedKey = key;
      return new Response("cached offline app shell");
    },
  };
  const context = vm.createContext({
    self,
    caches,
    URL,
    Response,
    fetch: async () => {
      throw new Error("offline");
    },
  });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8"),
    context,
  );

  fetchHandler({
    request: {
      method: "GET",
      mode: "navigate",
      url: "https://propertydesk.test/",
    },
    respondWith(promise) {
      responsePromise = promise;
    },
  });

  const response = await responsePromise;
  assert.equal(matchedKey, "./index.html");
  assert.equal(await response.text(), "cached offline app shell");
});

test("Properties grid totals the visible due, monthly payments, and loan balances", () => {
  const elements = new Map();
  const getElement = (id) => {
    if (!elements.has(id)) {
      elements.set(id, {
        value: id === "property-filter" ? "all" : "",
        checked: false,
        innerHTML: "",
        textContent: "",
        classList: { toggle() {} },
      });
    }
    return elements.get(id);
  };
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "property-views.js"),
      "utf8",
    ),
    context,
  );
  const feature = context.window.PropertyDeskPropertyViews.create({
    $: getElement,
    state: {
      properties: [{ id: "property-1", name: "One Oak", address: "1 Oak St" }],
      accounts: [
        {
          id: "account-1",
          property_id: "property-1",
          status: "active",
          account_type: "land_contract",
          payment_amount: 125,
          payment_frequency: "monthly",
          name: "Contract",
          party_name: "Buyer",
        },
        {
          id: "account-2",
          property_id: "property-1",
          status: "active",
          account_type: "rental",
          payment_amount: 200,
          payment_frequency: "monthly",
          name: "Rental",
          party_name: "Tenant",
        },
      ],
      payments: [],
      propertyHolders: [],
      workspaceMembers: [],
      user: null,
    },
    monthlyScheduledEstimate: (accounts) =>
      accounts.reduce((sum, account) => sum + account.payment_amount, 0),
    accountBalance: (account) => (account.id === "account-1" ? 1000 : 0),
    amountDueSince: (accounts) => (accounts[0].id === "account-1" ? 50 : 80),
    unpaidDueAccrualStart: () => "2026-10-01",
    todayIso: () => "2026-10-04",
    esc: (value) => String(value ?? ""),
    prettyKind: (value) => value,
    money: (value) => `$${Number(value).toFixed(2)}`,
    propertyAddress: (property) => property.address,
    collectedSince: () => 0,
    scheduledMonthlyRunRate: () => 0,
    monthStart: () => "2026-10-01",
    isPosted: () => true,
    prettyType: (value) => value,
    fmtDate: () => "",
    streetAddress: (property) => property.address,
    dateOnly: (value) => new Date(`${value}T12:00:00`),
    monthEnd: () => "2026-10-31",
    lateReminderMailto: () => "mailto:buyer@example.com",
    paymentFrequencyLabel: () => "Monthly",
    paymentStatusInMonth: () => "none",
  });

  feature.renderProperties();

  const totals = getElement("accounts-totals");
  assert.match(totals.innerHTML, /\$130\.00/);
  assert.match(totals.innerHTML, /\$325\.00/);
  assert.match(totals.innerHTML, /\$1000\.00/);

  getElement("property-filter").value = "rental";
  feature.renderProperties();
  assert.match(totals.innerHTML, /\$80\.00/);
  assert.match(totals.innerHTML, /\$200\.00/);
  assert.ok(totals.innerHTML.includes("—"));
});

test("property/account forms and ledger-entry forms expose separate workflows", () => {
  const context = vm.createContext({ window: {} });
  for (const filename of [
    "property-account-forms.js",
    "ledger-entry-forms.js",
    "create-actions.js",
  ]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
      context,
    );
  }
  const property = context.window.PropertyDeskPropertyAccountForms.create({});
  const ledger = context.window.PropertyDeskLedgerEntryForms.create({});
  const actions = context.window.PropertyDeskCreateActions.create({});
  for (const [feature, names] of [
    [property, ["resetPropertyForm", "resetAccountForm", "saveProperty", "saveAccount", "editAccount", "attachEvents"]],
    [ledger, ["savePayment", "saveExpense", "openPayment", "prefillPaymentAmount", "openPropertyPayment", "openExpense", "attachEvents"]],
    [actions, ["attachEvents"]],
  ]) {
    for (const name of names) assert.equal(typeof feature[name], "function", name);
  }
});

test("record-entry feature owns form event bindings and category hints", () => {
  const context = vm.createContext({ window: {} });
  for (const filename of ["property-account-forms.js", "ledger-entry-forms.js"]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
      context,
    );
  }
  const handlers = new Map();
  const toggles = [];
  const elements = new Map();
  const getElement = (id) => {
    if (!elements.has(id)) {
      elements.set(id, {
        value: id === "account-type" ? "rental" : "deposit_refund",
        addEventListener(event, handler) {
          handlers.set(`${id}:${event}`, handler);
        },
        classList: {
          toggle: (...args) => toggles.push([id, ...args]),
        },
      });
    }
    return elements.get(id);
  };
  const formContext = {
    $: getElement,
    state: { accounts: [] },
    fillSelect() {},
    prettyType: (type) => type,
  };
  const propertyForms = context.window.PropertyDeskPropertyAccountForms.create(formContext);
  const entryForms = context.window.PropertyDeskLedgerEntryForms.create(formContext);

  propertyForms.attachEvents(() => {});
  entryForms.attachEvents();
  assert.equal(typeof handlers.get("property-form:submit"), "function");
  assert.equal(typeof handlers.get("payment-form:submit"), "function");
  handlers.get("account-type:change")();
  handlers.get("expense-category:change")();
  assert.deepEqual(toggles, [
    ["loan-fields", "hidden", true],
    ["deposit-refund-hint", "hidden", false],
  ]);
});

test("record-entry feature owns create actions and handles empty workspace states", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", "create-actions.js"), "utf8"),
    context,
  );
  const handlers = new Map();
  const calls = [];
  const elements = new Map();
  const getElement = (id) => {
    if (!elements.has(id)) {
      elements.set(id, {
        value: id === "account-type" ? "rental" : "",
        checked: false,
        textContent: "",
        addEventListener(event, handler) {
          handlers.set(`${id}:${event}`, handler);
        },
        querySelector: () => ({ textContent: "" }),
        classList: { toggle() {}, remove() {}, add() {} },
        reset() {
          calls.push(`reset:${id}`);
        },
      });
    }
    return elements.get(id);
  };
  const button = (id) => getElement(id);
  const selectors = {
    '[data-open="property-modal"]': [button("property")],
    '[data-open="account-modal"]': [button("account")],
    '[data-open="payment-modal"]': [button("payment")],
    '[data-open="expense-modal"]': [button("expense")],
  };
  const state = { properties: [], accounts: [] };
  const feature = context.window.PropertyDeskCreateActions.create({
    $: getElement,
    state,
    resetPropertyForm: () => getElement("property-form").reset(),
    resetAccountForm: () => getElement("account-form").reset(),
    documentRef: { querySelectorAll: (selector) => selectors[selector] || [] },
    todayIso: () => "2026-10-04",
    toast: (message) => calls.push(`toast:${message}`),
    populateFormOptions: () => calls.push("populate-options"),
    openModal: (id) => calls.push(`open:${id}`),
    openPayment: () => calls.push("open-payment"),
    openExpense: () => calls.push("open-expense"),
  });
  const navigate = (view) => calls.push(`navigate:${view}`);

  feature.attachEvents(navigate);
  handlers.get("account:click")();
  handlers.get("payment:click")();
  handlers.get("expense:click")();
  assert.deepEqual(calls, [
    "toast:Add a property before creating an account",
    "navigate:properties",
    "toast:Add an account before recording a payment",
    "navigate:properties",
    "toast:Add a property before recording an expense",
    "navigate:properties",
  ]);

  calls.length = 0;
  handlers.get("property:click")();
  state.properties.push({ id: "property-1" });
  handlers.get("account:click")();
  handlers.get("expense:click")();
  assert.deepEqual(calls, [
    "reset:property-form",
    "open:property-modal",
    "reset:account-form",
    "populate-options",
    "open:account-modal",
    "open-expense",
  ]);
});

test("opening a payment for an account prefills its scheduled installment without overwriting typed amount", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "ledger-entry-forms.js"),
      "utf8",
    ),
    context,
  );
  const elements = new Map([
    ["payment-account", { value: "" }],
    ["payment-amount", { value: "" }],
    ["payment-date", { value: "" }],
    [
      "payment-form",
      {
        reset() {
          elements.get("payment-account").value = "";
          elements.get("payment-amount").value = "";
        },
      },
    ],
    ["payment-modal", { querySelector: () => ({ textContent: "" }) }],
    ["payment-modal-title", { textContent: "" }],
    ["payment-save-button", { textContent: "" }],
    ["payment-save-next", { classList: { remove() {} } }],
    ["allocation-preview", { innerHTML: "" }],
    ["income-category-wrap", { classList: { toggle() {} } }],
  ]);
  elements.get("payment-account").value = "account-1";
  const feature = context.window.PropertyDeskLedgerEntryForms.create({
    $: (id) => elements.get(id),
    state: {
      accounts: [
        { id: "account-1", payment_amount: 647, account_type: "rental" },
      ],
      pendingCorrection: null,
    },
    moneyInput: Number,
    populateFormOptions() {},
    fillSelect() {},
    prettyType: (value) => value,
    todayIso: () => "2026-10-04",
    openModal() {},
  });

  feature.openPayment("account-1");
  assert.equal(elements.get("payment-amount").value, 647);
  elements.get("payment-amount").value = "300";
  assert.equal(feature.prefillPaymentAmount(), false);
  assert.equal(elements.get("payment-amount").value, "300");
});

test("private document module exposes upload, delete, and open workflows", () => {
  const context = vm.createContext({ window: {} });
  const source = fs.readFileSync(
    path.join(__dirname, "..", "features", "documents.js"),
    "utf8",
  );
  vm.runInContext(source, context);

  const feature = context.window.PropertyDeskDocuments.create({});
  for (const action of [
    "uploadPropertyDocument",
    "deletePropertyDocument",
    "openPropertyDocument",
  ]) {
    assert.equal(typeof feature[action], "function", action);
  }
});

test("document upload stores objects privately and removes an orphan after metadata failure", async () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "documents.js"),
      "utf8",
    ),
    context,
  );
  const state = {
    selectedPropertyId: "property-1",
    workspaceOwnerId: "workspace-1",
    documents: [],
    client: {
      storage: {
        from(bucket) {
          assert.equal(bucket, "pd-private-agreements");
          return {
            async upload(path, file, options) {
              state.upload = { path, file, options };
              return { error: null };
            },
            async remove(paths) {
              state.removed = paths;
              return { error: null };
            },
          };
        },
      },
      from(table) {
        assert.equal(table, "pd_documents");
        return {
          async insert(row) {
            state.document = row;
            return { error: { message: "metadata insert failed" } };
          },
        };
      },
    },
  };
  const messages = [];
  const input = {
    files: [{ name: "Agreement.pdf", size: 5, type: "application/pdf" }],
    value: "selected",
  };
  const feature = context.window.PropertyDeskDocuments.create({
    state,
    toast: (message) => messages.push(message),
    fetchAll: async () => assert.fail("failed metadata must not refresh"),
    openPropertyDetails: () =>
      assert.fail("failed metadata must not reopen details"),
    makeId: () => "file-id",
  });

  await feature.uploadPropertyDocument(input);

  assert.equal(input.value, "");
  assert.equal(
    state.upload.path,
    "workspace-1/property-1/file-id-Agreement.pdf",
  );
  assert.equal(state.upload.options.contentType, "application/pdf");
  assert.equal(state.upload.options.upsert, false);
  assert.equal(state.document.user_id, "workspace-1");
  assert.equal(state.removed.length, 1);
  assert.equal(state.removed[0], state.upload.path);
  assert.match(messages[0], /metadata insert failed/);
});

test("backup export aborts before download when a private document path escapes the workspace", async () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "exports.js"),
      "utf8",
    ),
    context,
  );
  const tables = [
    "pd_properties",
    "pd_accounts",
    "pd_agreement_versions",
    "pd_payments",
    "pd_expenses",
    "pd_deposit_entries",
    "pd_documents",
    "pd_import_batches",
    "pd_audit_events",
    "pd_workspace_members",
    "pd_property_holders",
  ];
  const button = { textContent: "Export backup", disabled: false };
  const state = {
    user: { id: "workspace-1" },
    workspaceOwnerId: "workspace-1",
    accounts: [],
    properties: [],
    client: {
      from(table) {
        assert.ok(tables.includes(table));
        return {
          select() {
            return {
              async range() {
                return {
                  data:
                    table === "pd_documents"
                      ? [
                          {
                            id: "doc-1",
                            user_id: "workspace-1",
                            storage_path: "other-workspace/property/file.pdf",
                            file_name: "file.pdf",
                          },
                        ]
                      : [],
                  error: null,
                };
              },
            };
          },
        };
      },
    },
  };
  const messages = [];
  const downloads = [];
  const feature = context.window.PropertyDeskExports.create({
    $: (id) => (id === "export-all" ? button : null),
    state,
    createBackup: () =>
      assert.fail("invalid paths must stop before backup creation"),
    todayIso: () => "2026-10-04",
    toast: (message) => messages.push(message),
    prettyType: (value) => value,
    accountBalance: () => 0,
    downloadBlob: (blob) => downloads.push(blob),
    zipUtils: {
      createZip: () =>
        assert.fail("invalid paths must stop before zip creation"),
    },
  });

  await feature.exportAll();

  assert.equal(downloads.length, 0);
  assert.equal(button.disabled, false);
  assert.equal(button.textContent, "Export backup");
  assert.match(messages.at(-1), /invalid private storage path/);
});

test("password reset requests keep generic feedback and restore the submit control", async () => {
  const context = vm.createContext({ window: {}, document: {} });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", "auth.js"), "utf8"),
    context,
  );
  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id)) {
      elements.set(id, {
        value: "owner@example.com",
        disabled: false,
        textContent: "",
        reportValidity: () => true,
      });
    }
    return elements.get(id);
  };
  const resetCalls = [];
  const feature = context.window.PropertyDeskAuth.create({
    $: element,
    state: {
      client: {
        auth: {
          async resetPasswordForEmail(...args) {
            resetCalls.push(args);
            return { error: { message: "account-specific failure" } };
          },
        },
      },
    },
    fetchAll: async () => {},
    toast() {},
    windowRef: {
      location: { origin: "https://example.test", pathname: "/propertydesk/" },
    },
    documentRef: {},
  });

  await feature.requestPasswordReset();

  assert.equal(resetCalls.length, 1);
  assert.equal(resetCalls[0][0], "owner@example.com");
  assert.equal(
    resetCalls[0][1].redirectTo,
    "https://example.test/propertydesk/",
  );
  assert.equal(
    element("auth-message").textContent,
    "Unable to request a reset right now. Try again later.",
  );
  assert.equal(element("forgot-password").disabled, false);
});

test("auth session restoration and state changes stay inside the auth feature", async () => {
  const context = vm.createContext({ window: {}, URLSearchParams });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", "auth.js"), "utf8"),
    context,
  );
  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id))
      elements.set(id, {
        value: "",
        textContent: "",
        dataset: {},
        classList: {
          add() {},
          remove() {},
          toggle() {},
        },
      });
    return elements.get(id);
  };
  const state = {
    user: null,
    passwordRecoveryInProgress: false,
    client: {
      auth: {
        async getSession() {
          return {
            data: {
              session: {
                access_token: "reset-token",
                user: { id: "owner-1" },
              },
            },
          };
        },
      },
    },
  };
  const calls = [];
  const feature = context.window.PropertyDeskAuth.create({
    $: element,
    state,
    fetchAll: async () => calls.push("fetch-workspace"),
    toast() {},
    windowRef: {
      location: { hash: "#type=recovery&access_token=reset-token" },
    },
    documentRef: { querySelector: () => element("auth-intro") },
  });

  await feature.restoreAuthSession();
  assert.equal(state.user.id, "owner-1");
  assert.equal(state.passwordRecoveryInProgress, true);
  assert.equal(element("auth-title").textContent, "Choose a new password");
  assert.deepEqual(calls, []);

  feature.handleAuthStateChange("SIGNED_OUT");
  assert.equal(state.user, null);
  assert.equal(state.passwordRecoveryInProgress, false);
  assert.equal(element("auth-form").dataset.mode, "signin");

  feature.handleAuthStateChange("SIGNED_IN", { user: { id: "owner-2" } });
  assert.equal(state.user.id, "owner-2");
  assert.deepEqual(calls, ["fetch-workspace"]);
});

test("auth feature owns login controls and clears workspace data on sign-out", async () => {
  const context = vm.createContext({ window: {}, document: {} });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", "auth.js"), "utf8"),
    context,
  );
  const handlers = new Map();
  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id))
      elements.set(id, {
        textContent: "",
        autocomplete: "",
        dataset: { mode: "signup" },
        classList: { add() {}, remove() {}, toggle() {} },
        addEventListener(event, handler) {
          handlers.set(`${id}:${event}`, handler);
        },
      });
    return elements.get(id);
  };
  let signOutCalls = 0;
  const state = {
    user: { id: "owner-1" },
    properties: [{ id: "property-1" }],
    accounts: [{ id: "account-1" }],
    payments: [{ id: "payment-1" }],
    passwordRecoveryInProgress: true,
    client: { auth: { async signOut() { signOutCalls += 1; } } },
  };
  const feature = context.window.PropertyDeskAuth.create({
    $: element,
    state,
    fetchAll: async () => {},
    toast() {},
    documentRef: { querySelector: () => element("auth-intro") },
  });

  feature.attachEvents();
  for (const key of [
    "sign-out:click",
    "auth-toggle:click",
    "auth-form:submit",
    "forgot-password:click",
    "password-reset-form:submit",
    "reset-password-cancel:click",
  ]) {
    assert.equal(typeof handlers.get(key), "function", key);
  }

  await handlers.get("sign-out:click")();
  assert.equal(signOutCalls, 1);
  assert.equal(state.user, null);
  assert.equal(state.properties.length, 0);
  assert.equal(state.accounts.length, 0);
  assert.equal(state.payments.length, 0);
  assert.equal(state.passwordRecoveryInProgress, false);
  assert.equal(element("auth-form").dataset.mode, "signin");
});

test("navigation owns theme toggles, page routing, and modal close shortcuts", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", "navigation.js"), "utf8"),
    context,
  );
  const handlers = new Map();
  const attributes = {};
  const classes = new Set();
  const makeElement = (id, dataset = {}) => ({
    id,
    dataset,
    textContent: "",
    classList: {
      toggle(name, enabled) {
        if (enabled) classes.add(`${id}:${name}`);
        else classes.delete(`${id}:${name}`);
      },
    },
    setAttribute(name, value) {
      attributes[`${id}:${name}`] = value;
    },
    addEventListener(name, handler) {
      handlers.set(`${id}:${name}`, handler);
    },
    querySelector(selector) {
      return selector === ".theme-label"
        ? themeLabel
        : selector === ".theme-icon"
          ? themeIcon
          : null;
    },
    closest() {
      return modal;
    },
  });
  const themeLabel = { textContent: "" };
  const themeIcon = { textContent: "" };
  const meta = { setAttribute: (name, value) => (attributes[`meta:${name}`] = value) };
  const toggle = makeElement("theme");
  const propertiesPage = makeElement("page-properties");
  const workspacePage = makeElement("page-workspace");
  const reportsPage = makeElement("page-reports");
  const propertiesLink = makeElement("properties-link", { view: "properties" });
  const reportsLink = makeElement("reports-link", { view: "reports" });
  const workspaceLink = makeElement("workspace-link", { view: "workspace" });
  const gotoLink = makeElement("goto-link", { goto: "reports" });
  const closeButton = makeElement("close-button");
  const userMenu = makeElement("user-menu");
  const modal = { id: "test-modal" };
  const selectors = {
    "[data-theme-toggle]": [toggle],
    ".page": [propertiesPage, workspacePage, reportsPage],
    ".nav-link": [propertiesLink, reportsLink, workspaceLink],
    "[data-goto]": [gotoLink],
    "[data-close]": [closeButton],
  };
  const documentRef = {
    documentElement: { dataset: { theme: "dark" } },
    querySelector: (selector) => (selector === 'meta[name="theme-color"]' ? meta : null),
    querySelectorAll: (selector) => selectors[selector] || [],
  };
  const storageWrites = [];
  const routes = [];
  const state = { view: "properties" };
  const crumb = { textContent: "" };
  const feature = context.window.PropertyDeskNavigation.create({
    $: (id) =>
      id === "page-crumb" ? crumb : id === "user-menu" ? userMenu : null,
    state,
    renderWorkspaceSettings: () => routes.push("workspace-settings"),
    closeModal: (element) => routes.push(`close:${element.id}`),
    documentRef,
    windowRef: { scrollTo: () => routes.push("scroll") },
    storage: { setItem: (...args) => storageWrites.push(args) },
  });

  feature.attachEvents();
  assert.equal(attributes["theme:aria-label"], "Switch to light mode");
  assert.equal(attributes["theme:aria-pressed"], "true");
  assert.equal(themeLabel.textContent, "Light mode");
  assert.equal(themeIcon.textContent, "☼");

  handlers.get("theme:click")();
  assert.equal(documentRef.documentElement.dataset.theme, "light");
  assert.equal(attributes["meta:content"], "#f6f7f4");
  assert.deepEqual(storageWrites, [["propertydesk-theme", "light"]]);

  handlers.get("workspace-link:click")();
  assert.equal(state.view, "workspace");
  assert.equal(crumb.textContent, "Workspace");
  assert.ok(classes.has("page-properties:active") === false);
  assert.ok(classes.has("page-workspace:active"));
  assert.ok(classes.has("page-reports:active") === false);
  assert.ok(classes.has("workspace-link:active"));
  assert.deepEqual(routes.slice(0, 2), ["workspace-settings", "scroll"]);

  handlers.get("goto-link:click")();
  assert.equal(state.view, "reports");
  handlers.get("user-menu:click")();
  assert.equal(state.view, "workspace");
  assert.deepEqual(routes.slice(-2), ["workspace-settings", "scroll"]);
  handlers.get("close-button:click")();
  assert.equal(routes.at(-1), "close:test-modal");
});

test("navigation feature loads before app startup and is precached", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8");
  assert.ok(
    html.indexOf("features/navigation.js") < html.indexOf("app.js"),
    "navigation should load before the app coordinator",
  );
  assert.match(worker, /'\.\/features\/navigation\.js'/);
});

test("workspace settings render member labels and escape untrusted text", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "workspace.js"),
      "utf8",
    ),
    context,
  );
  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id))
      elements.set(id, {
        value: "",
        innerHTML: "",
        classList: {
          toggle(name, hidden) {
            this.lastToggle = [name, hidden];
          },
        },
      });
    return elements.get(id);
  };
  const state = {
    user: { id: "owner-1", user_metadata: { display_name: "Owner" } },
    workspaceOwnerId: "owner-1",
    workspaceMembers: [
      {
        member_user_id: "owner-1",
        display_name: "<Owner>",
        email: "owner@example.test",
        is_owner: true,
      },
      {
        member_user_id: "member-1",
        display_name: "Member",
        email: "member@example.test",
        is_owner: false,
      },
    ],
    reminderLogs: [],
    accounts: [],
    properties: [],
  };
  const feature = context.window.PropertyDeskWorkspace.create({
    $: element,
    state,
    esc: (value) =>
      String(value ?? "").replace(
        /[&<>"']/g,
        (char) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[char],
      ),
    fmtDate: () => "Oct 2026",
    money: () => "$0.00",
    toast() {},
    fetchAll: async () => {},
    updateGreeting() {},
    confirmAction: () => true,
  });

  feature.renderWorkspaceSettings();

  assert.equal(element("display-name").value, "Owner");
  assert.match(element("workspace-members").innerHTML, /&lt;Owner&gt;/);
  assert.match(element("workspace-members").innerHTML, /Full workspace access/);
  assert.deepEqual(element("member-add-form").classList.lastToggle, [
    "hidden",
    false,
  ]);
  assert.match(element("reminder-activity").innerHTML, /Reminders are off/);
});

test("workspace feature owns profile and member form bindings", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", "workspace.js"), "utf8"),
    context,
  );
  const handlers = new Map();
  const feature = context.window.PropertyDeskWorkspace.create({
    $: (id) => ({
      addEventListener(event, handler) {
        handlers.set(`${id}:${event}`, handler);
      },
    }),
  });

  feature.attachEvents();

  assert.equal(typeof handlers.get("display-name-form:submit"), "function");
  assert.equal(typeof handlers.get("member-add-form:submit"), "function");
});

test("adding a workspace member clears the address only after successful refresh", async () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "workspace.js"),
      "utf8",
    ),
    context,
  );
  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id))
      elements.set(id, {
        value: id === "member-email" ? " spouse@example.test " : "",
        classList: { toggle() {} },
      });
    return elements.get(id);
  };
  const calls = [];
  const messages = [];
  const feature = context.window.PropertyDeskWorkspace.create({
    $: element,
    state: {
      client: {
        async rpc(name, args) {
          calls.push([name, args]);
          return { error: null };
        },
      },
      workspaceMembers: [],
      reminderLogs: [],
      accounts: [],
      properties: [],
      user: { id: "owner-1", user_metadata: { display_name: "Owner" } },
      workspaceOwnerId: "owner-1",
    },
    esc: String,
    fmtDate: () => "",
    money: () => "",
    toast: (message) => messages.push(message),
    fetchAll: async () => calls.push(["refresh"]),
    updateGreeting() {},
  });

  await feature.addWorkspaceMember({ preventDefault() {} });

  assert.equal(calls.length, 2);
  assert.equal(calls[0][0], "pd_add_workspace_member");
  assert.equal(calls[0][1].p_email, "spouse@example.test");
  assert.equal(calls[1][0], "refresh");
  assert.equal(element("display-name").value, "Owner");
  assert.equal(element("member-email").value, "");
  assert.equal(messages.at(-1), "Workspace member added");
});

test("property quick notes normalize whitespace and scope updates to the workspace", async () => {
  const context = vm.createContext({ window: {}, document: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "property-management.js"),
      "utf8",
    ),
    context,
  );
  const updates = [];
  const messages = [];
  let refreshed = false;
  const state = {
    workspaceOwnerId: "workspace-1",
    selectedPropertyId: "property-1",
    properties: [
      { id: "property-1", address: "10 Main St", notes: "Old note" },
    ],
    client: {
      from(table) {
        assert.equal(table, "pd_properties");
        return {
          update(values) {
            updates.push(values);
            return {
              eq(column, value) {
                updates.push([column, value]);
                return {
                  eq: async (ownerColumn, ownerId) => {
                    updates.push([ownerColumn, ownerId]);
                    return { error: null };
                  },
                };
              },
            };
          },
        };
      },
    },
  };
  const feature = context.window.PropertyDeskPropertyManagement.create({
    $: () => {},
    state,
    toast: (message) => messages.push(message),
    fetchAll: async () => {
      refreshed = true;
    },
    todayIso: () => "2026-10-04",
    streetAddress: (property) => property.address,
    openPropertyDetails() {},
    promptAction: () => "  Follow-up\n needed   soon ",
  });

  await feature.editPropertyQuickNote("property-1");

  assert.equal(updates[0].notes, "Follow-up needed soon");
  assert.equal(updates[1][0], "id");
  assert.equal(updates[1][1], "property-1");
  assert.equal(updates[2][0], "user_id");
  assert.equal(updates[2][1], "workspace-1");
  assert.equal(refreshed, true);
  assert.equal(messages.at(-1), "Property note saved");
});

test("deposit maintenance retains adjustment audit details", async () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "deposit-maintenance.js"),
      "utf8",
    ),
    context,
  );
  const prompts = ["250.00", "Deposit retention per move-out inspection"];
  const inserts = [];
  const messages = [];
  const calls = [];
  const state = {
    workspaceOwnerId: "workspace-1",
    accounts: [{ id: "rental-1", account_type: "rental" }],
    client: {
      from(table) {
        return {
          async insert(payload) {
            inserts.push([table, payload]);
            return { error: null };
          },
        };
      },
    },
  };
  const feature = context.window.PropertyDeskDepositMaintenance.create({
    state,
    moneyInput: Number,
    todayIso: () => "2026-10-04",
    toast: (message) => messages.push(message),
    fetchAll: async () => calls.push("refresh"),
    closeModal: (modal) => calls.push(["close", modal.id]),
    openAccountDetails: async (id) => calls.push(["open-account", id]),
    confirmAction: () => true,
    promptAction: () => prompts.shift(),
  });

  await feature.recordDepositAdjustment("rental-1", "retained");

  assert.equal(inserts[0][0], "pd_deposit_entries");
  assert.equal(inserts[0][1].user_id, "workspace-1");
  assert.equal(inserts[0][1].amount, 250);
  assert.equal(
    inserts[0][1].reason,
    "Deposit retention per move-out inspection",
  );
  assert.equal(messages.at(-1), "Deposit retention recorded");
  assert.equal(calls.filter((call) => call === "refresh").length, 1);
});

test("account maintenance closes an account while preserving its history", async () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "account-maintenance.js"),
      "utf8",
    ),
    context,
  );
  const updates = [];
  const calls = [];
  const messages = [];
  const state = {
    client: {
      from(table) {
        return {
          update(payload) {
            updates.push([table, payload]);
            return {
              async eq(column, value) {
                updates.push([column, value]);
                return { error: null };
              },
            };
          },
        };
      },
    },
  };
  const feature = context.window.PropertyDeskAccountMaintenance.create({
    $: (id) => ({ id }),
    state,
    confirmAction: () => true,
    closeModal: (modal) => calls.push(["close", modal.id]),
    fetchAll: async () => calls.push("refresh"),
    toast: (message) => messages.push(message),
  });

  await feature.closeAccount({ id: "account-1", name: "Rental" });

  assert.equal(updates[0][0], "pd_accounts");
  assert.equal(updates[0][1].status, "closed");
  assert.deepEqual(updates[1], ["id", "account-1"]);
  assert.deepEqual(calls, [["close", "detail-modal"], "refresh"]);
  assert.equal(messages.at(-1), "Account closed");
});

test("transaction maintenance voids a posted row with an audit reason", async () => {
  const context = vm.createContext({
    window: {},
    Event: class MockEvent {},
    Option: class MockOption {},
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "transaction-maintenance.js"),
      "utf8",
    ),
    context,
  );
  const updates = [];
  const messages = [];
  let refreshes = 0;
  const state = {
    client: {
      from(table) {
        return {
          update(payload) {
            updates.push([table, payload]);
            return {
              eq(column, value) {
                updates.push([column, value]);
                return {
                  eq(statusColumn, status) {
                    updates.push([statusColumn, status]);
                    return {
                      select() {
                        return {
                          async maybeSingle() {
                            return { data: { id: "payment-1" }, error: null };
                          },
                        };
                      },
                    };
                  },
                };
              },
            };
          },
        };
      },
    },
  };
  const feature = context.window.PropertyDeskTransactionMaintenance.create({
    $() {},
    state,
    confirmAction: () => true,
    promptAction: () => "Entered in error",
    timestamp: () => "2026-10-04T12:00:00.000Z",
    fetchAll: async () => { refreshes += 1; },
    toast: (message) => messages.push(message),
  });

  await feature.voidTransaction("income", "payment-1");

  assert.equal(updates[0][0], "pd_payments");
  assert.equal(updates[0][1].status, "voided");
  assert.equal(updates[0][1].voided_at, "2026-10-04T12:00:00.000Z");
  assert.equal(updates[0][1].void_reason, "Entered in error");
  assert.equal(messages.at(-1), "Transaction voided; original entry preserved");
  assert.equal(refreshes, 1);
});

test("transaction corrections reopen posted payments and expenses with audit reasons", () => {
  const context = vm.createContext({
    window: {},
    Event: class MockEvent {
      constructor(type) {
        this.type = type;
      }
    },
    Option: class MockOption {
      constructor(text, value) { this.text = text; this.value = value; }
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "transaction-maintenance.js"),
      "utf8",
    ),
    context,
  );
  const values = new Map();
  const field = (id) => {
    if (!values.has(id))
      values.set(id, {
        value: "",
        textContent: "",
        dispatchEvent(event) {
          this.lastEvent = event.type;
        },
      });
    return values.get(id);
  };
  const accountSelect = {
    value: "",
    options: [{ value: "account-1" }],
    add(option) {
      this.options.push(option);
    },
  };
  values.set("payment-account", accountSelect);
  values.set("payment-modal", {
    querySelector: () => field("payment-eyebrow"),
  });
  values.set("expense-modal", {
    querySelector: () => field("expense-eyebrow"),
  });
  values.set("payment-save-next", {
    classList: { add: (value) => (field("save-next-class").value = value) },
  });
  values.set("expense-save-next", {
    classList: {
      add: (value) => (field("expense-save-next-class").value = value),
    },
  });

  const state = {
    accounts: [
      {
        id: "account-1",
        name: "Land contract",
        party_name: "Buyer",
        account_type: "land_contract",
      },
    ],
    payments: [
      {
        id: "payment-1",
        status: "posted",
        account_id: "account-1",
        amount: 75,
        received_date: "2026-10-02",
        payment_method: "check",
        income_category: "installment",
        memo: "Receipt 14",
      },
    ],
    expenses: [
      {
        id: "expense-1",
        status: "posted",
        property_id: "property-1",
        account_id: "account-1",
        amount: 40,
        expense_date: "2026-10-03",
        category: "repairs",
        payee: "Plumber",
        payment_method: "check",
        memo: "Invoice 2",
      },
    ],
    pendingCorrection: null,
  };
  const calls = [];
  const feature = context.window.PropertyDeskTransactionMaintenance.create({
    $: (id) => field(id),
    state,
    promptAction: () => "Corrected bank posting date",
    prettyType: () => "Land contract",
    openPayment: () => calls.push("open-payment"),
    openExpense: () => calls.push("open-expense"),
    updateAllocationPreview: () => calls.push("refresh-allocation"),
    toast: (message) => calls.push(message),
  });

  feature.correctTransaction("income", "payment-1");

  assert.equal(field("payment-amount").value, 75);
  assert.equal(field("payment-date").value, "2026-10-02");
  assert.equal(field("payment-method").value, "check");
  assert.equal(state.pendingCorrection.kind, "payment");
  assert.equal(state.pendingCorrection.id, "payment-1");
  assert.equal(state.pendingCorrection.reason, "Corrected bank posting date");
  assert.equal(field("payment-modal-title").textContent, "Correct payment");
  assert.equal(field("payment-eyebrow").textContent, "TRANSACTION CORRECTION");
  assert.deepEqual(calls, ["open-payment", "refresh-allocation"]);

  feature.correctTransaction("expense", "expense-1");

  assert.equal(field("expense-amount").value, 40);
  assert.equal(field("expense-date").value, "2026-10-03");
  assert.equal(field("expense-category").value, "repairs");
  assert.equal(field("expense-property").lastEvent, "change");
  assert.equal(state.pendingCorrection.kind, "expense");
  assert.equal(state.pendingCorrection.id, "expense-1");
  assert.equal(field("expense-modal-title").textContent, "Correct expense");
  assert.equal(field("expense-eyebrow").textContent, "TRANSACTION CORRECTION");
  assert.deepEqual(calls, [
    "open-payment",
    "refresh-allocation",
    "open-expense",
  ]);
});

test("reminder preview uses current form values and escapes recipient-facing text", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "reminder-preview.js"),
      "utf8",
    ),
    context,
  );
  const values = {
    "account-property": { value: "property-1" },
    "account-id": { value: "" },
    "account-type": { value: "land_contract" },
    "account-name": { value: "Installment" },
    "account-party": { value: "<Renter>" },
    "account-start": { value: "" },
    "account-next-due": { value: "" },
    "account-payment": { value: "550" },
    "account-frequency": { value: "monthly" },
    "account-party-email": { value: "buyer@example.test" },
    "reminder-preview-content": { innerHTML: "" },
  };
  const state = {
    properties: [{ id: "property-1", address: "10 Main <St>" }],
    payments: [],
  };
  const calls = [];
  const feature = context.window.PropertyDeskReminderPreview.create({
    $: (id) => values[id],
    state,
    amountDueSince: (accounts, payments, start, end) => {
      calls.push({ account: accounts[0], payments, start, end });
      return 550;
    },
    unpaidDueAccrualStart: () => "2026-10-01",
    todayIso: () => "2026-10-04",
    monthEnd: () => "2026-10-31",
    moneyInput: Number,
    toast: (message) => calls.push(message),
    dateOnly: () => ({ toLocaleDateString: () => "October 2026" }),
    monthStart: () => "2026-10-01",
    propertyAddress: (property) => property.address,
    money: (value) => "USD " + Number(value).toFixed(2),
    esc: (value) =>
      String(value ?? "").replace(
        /[&<>"']/g,
        (char) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[char],
      ),
    openModal: (id) => calls.push(id),
  });

  feature.previewReminderEmail();

  assert.equal(calls[0].account.payment_amount, 550);
  assert.equal(calls[0].start, "2026-10-01");
  assert.match(
    values["reminder-preview-content"].innerHTML,
    /buyer@example\.test/,
  );
  assert.match(values["reminder-preview-content"].innerHTML, /&lt;Renter&gt;/);
  assert.match(values["reminder-preview-content"].innerHTML, /&lt;St&gt;/);
  assert.match(
    values["reminder-preview-content"].innerHTML,
    /Hello &lt;Renter&gt;,<br><br>Our records show no rent or installment payment recorded for October 2026\./,
  );
  assert.match(
    values["reminder-preview-content"].innerHTML,
    /Unpaid due as of 2026-10-31: USD 550\.00<br>Property: 10 Main &lt;St&gt;/,
  );
  assert.equal(calls.at(-1), "reminder-preview-modal");
});

test("recording a loan payment does not invent principal or interest splits", async () => {
  const context = vm.createContext({ window: {} });
  const source = fs.readFileSync(
    path.join(__dirname, "..", "features", "ledger-entry-forms.js"),
    "utf8",
  );
  vm.runInContext(source, context);

  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id)) {
      elements.set(id, {
        classList: { add() {}, remove() {}, toggle() {} },
        focus() {},
        reset() {},
        value: "",
      });
    }
    return elements.get(id);
  };
  element("payment-account").value = "account-1";
  element("payment-amount").value = "550.00";
  element("payment-date").value = "2026-10-04";
  element("payment-method").value = "manual";
  const state = {
    workspaceOwnerId: "workspace-1",
    accounts: [{ id: "account-1", account_type: "land_contract" }],
    pendingCorrection: null,
    client: {
      from(table) {
        assert.equal(table, "pd_payments");
        return {
          async insert(payload) {
            state.savedPayment = payload;
            return { error: null };
          },
        };
      },
    },
  };
  const feature = context.window.PropertyDeskLedgerEntryForms.create({
    $: element,
    state,
    moneyInput: (value) => Number(value),
    todayIso: () => "2026-10-04",
    toast() {},
    closeModal() {},
    fetchAll: async () => {},
    fillSelect() {},
    populateFormOptions() {},
    prettyType: (value) => value,
    paymentFrequencyLabel: (value) => value,
    openModal() {},
  });

  await feature.savePayment({ preventDefault() {} });

  assert.equal(state.savedPayment.amount, 550);
  assert.equal(state.savedPayment.income_category, "installment");
  assert.equal(state.savedPayment.principal_amount, 0);
  assert.equal(state.savedPayment.interest_amount, 0);
  assert.equal(state.savedPayment.unapplied_amount, 550);
});

test("CSV imports report a real zero accepted by the server as zero", async () => {
  const context = vm.createContext({ window: {} });
  const source = fs.readFileSync(
    path.join(__dirname, "..", "features", "imports.js"),
    "utf8",
  );
  vm.runInContext(source, context);

  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id)) {
      elements.set(id, {
        classList: { add() {}, remove() {}, toggle() {} },
        checked: false,
        disabled: false,
        textContent: "",
        value: "",
      });
    }
    return elements.get(id);
  };
  const state = {
    accounts: [],
    properties: [],
    client: { rpc: async () => ({ data: { rows_accepted: 0 }, error: null }) },
  };
  const feature = context.window.PropertyDeskImportFeature.create({
    $: element,
    state,
    parseCSV: () => [{}],
    selectImportRows: (rows) => rows,
    validateAccountRows: () => ({
      valid: [{ account_name: "Test" }],
      errors: [],
      total: 1,
    }),
    validateExpenseRows() {},
    validatePaymentRows() {},
    esc: (value) => String(value ?? ""),
    todayIso: () => "2026-10-04",
    openModal() {},
    closeModal() {},
    fetchAll: async () => {},
    toast() {},
  });

  await feature.importAccounts({ name: "accounts.csv", text: async () => "" });
  await state.pendingImport.commit(
    state.pendingImport.rows,
    state.pendingImport,
  );

  assert.match(
    element("import-status").textContent,
    /Imported 0 accounts; 1 row was skipped/,
  );
});
