const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

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
  assert.equal(typeof account.openAccountDetails, "function");
});

test("account details render action targets without owning action listeners", async () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", "account-details.js"), "utf8"),
    context,
  );
  const account = {
    id: "account-1",
    property_id: "property-1",
    account_type: "rental",
    name: "Rental",
    party_name: "Tenant",
    payment_amount: 800,
    payment_frequency: "monthly",
    next_due_date: "2026-11-01",
  };
  const elements = new Map();
  const $ = (id) => {
    if (!elements.has(id)) {
      elements.set(id, {
        classList: { add() {}, remove() {} },
        querySelector: () => ({ textContent: "" }),
      });
    }
    return elements.get(id);
  };
  const feature = context.window.PropertyDeskAccountDetails.create({
    $,
    state: {
      auditRequestId: 0,
      accounts: [account],
      properties: [{ id: "property-1", name: "Main House" }],
      payments: [],
    },
    isPosted: () => true,
    money: (value) => `$${value}`,
    fmtDate: () => "today",
    esc: String,
    prettyType: (type) => type,
    paymentFrequencyLabel: () => "Monthly",
    accountBalance: () => 0,
    amortizationSchedule: () => [],
    amountDueSince: () => 0,
    unpaidDueAccrualStart: () => "2026-10-01",
    todayIso: () => "2026-10-05",
    openModal() {},
    propertyAddress: (property) => property.name,
    depositSectionHTML: () => "",
    renderAccountHistory: async () => "",
  });

  await feature.openAccountDetails(account.id);
  assert.match(elements.get("detail-content").innerHTML, /data-account-detail-edit="account-1"/);
  assert.match(elements.get("detail-content").innerHTML, /data-account-detail-payment="account-1"/);
  assert.match(elements.get("detail-content").innerHTML, /data-account-detail-close="account-1"/);
});

test("account detail event router dispatches edit, payment, and close actions", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", "account-detail-events.js"), "utf8"),
    context,
  );
  const account = { id: "account-1" };
  const calls = [];
  let clickHandler;
  const feature = context.window.PropertyDeskAccountDetailEvents.create({
    $: (id) => ({ id, addEventListener: (_event, handler) => { clickHandler = handler; } }),
    state: { accounts: [account] },
    closeModal: (modal) => calls.push(`close:${modal.id}`),
    editAccount: (value) => calls.push(`edit:${value.id}`),
    openPayment: (id) => calls.push(`payment:${id}`),
    closeAccount: (value) => calls.push(`account-close:${value.id}`),
  });
  feature.attachEvents();
  const actions = [
    ["[data-account-detail-edit]", { accountDetailEdit: "account-1" }],
    ["[data-account-detail-payment]", { accountDetailPayment: "account-1" }],
    ["[data-account-detail-close]", { accountDetailClose: "account-1" }],
  ];
  for (const [selector, dataset] of actions) {
    clickHandler({
      target: { closest: (value) => value === selector ? { dataset } : null },
    });
  }
  assert.deepEqual(calls, [
    "close:detail-modal", "edit:account-1",
    "close:detail-modal", "payment:account-1",
    "account-close:account-1",
  ]);
});

test("property activity details include posted and voided records without counting voids", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", "property-activity-details.js"), "utf8"),
    context,
  );
  const activity = context.window.PropertyDeskPropertyActivityDetails.create({
    state: {
      payments: [
        { account_id: "account-1", amount: 500, received_date: "2026-10-04", status: "posted", memo: "October rent" },
        { account_id: "account-1", amount: 90, received_date: "2026-10-03", status: "voided", memo: "<cancelled>" },
      ],
      expenses: [
        { property_id: "property-1", amount: 75, expense_date: "2026-10-02", status: "posted", payee: "Plumber" },
        { property_id: "property-1", amount: 40, expense_date: "2026-10-01", status: "voided", payee: "Old vendor" },
      ],
    },
    isPosted: (record) => record.status !== "voided",
    sumIncome: (rows) => rows.reduce((total, row) => total + Number(row.amount || 0), 0),
    sumOperatingExpenses: (rows) => rows.reduce((total, row) => total + Number(row.amount || 0), 0),
    money: (amount) => `$${Number(amount).toFixed(2)}`,
    fmtDate: (date) => date,
    esc: (value) => String(value).replaceAll("<", "&lt;").replaceAll(">", "&gt;"),
  });

  const result = activity.renderPropertyActivity("property-1", [{ id: "account-1", name: "Rental" }]);
  assert.equal(result.incomeTotal, 500);
  assert.equal(result.expenseTotal, 75);
  assert.match(result.html, /October rent/);
  assert.match(result.html, /transaction-voided/);
  assert.match(result.html, /&lt;cancelled&gt;/);
  assert.match(result.html, /−\$75\.00/);
});

test("deposit details render rental-only ledger rows and preserve voided markers", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", "deposit-details.js"), "utf8"),
    context,
  );
  let ledgerReads = 0;
  const details = context.window.PropertyDeskDepositDetails.create({
    state: {
      payments: [{ id: "payment-1", memo: "Move-in" }],
      expenses: [],
    },
    depositLedger: () => {
      ledgerReads += 1;
      return {
        entries: [{
          id: "entry-1",
          entry_type: "received",
          movement_date: "2026-10-01",
          amount: 500,
          source_payment_id: "payment-1",
        }, {
          id: "entry-2",
          entry_type: "retained",
          movement_date: "2026-10-02",
          amount: 100,
          reason: "Repair",
        }],
        active: [{ id: "entry-1" }],
        totals: { held: 400, received: 500, refunded: 0, retained: 100, restored: 0 },
      };
    },
    money: (value) => `$${value.toFixed(2)}`,
    fmtDate: (value) => value,
    esc: (value) => String(value).replaceAll("<", "&lt;"),
  });

  assert.equal(details.depositSectionHTML({ id: "note-1", account_type: "note" }), "");
  assert.equal(ledgerReads, 0);
  const html = details.depositSectionHTML({ id: "rental-1", account_type: "rental" });
  assert.equal(ledgerReads, 1);
  assert.match(html, /Security deposit ledger/);
  assert.match(html, /\$400\.00/);
  assert.match(html, /Move-in/);
  assert.match(html, /transaction-voided/);
  assert.match(html, /Source transaction voided/);
  assert.match(html, /data-deposit-adjustment="retained"/);
});

test("deposit detail event router refreshes the ledger after a recorded adjustment", async () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", "deposit-detail-events.js"), "utf8"),
    context,
  );
  const calls = [];
  let held = 100;
  let clickHandler;
  const elements = new Map([
    ["detail-content", { addEventListener: (_name, handler) => { clickHandler = handler; } }],
    ["detail-deposit-section", { innerHTML: "" }],
  ]);
  const feature = context.window.PropertyDeskDepositDetailEvents.create({
    $: (id) => elements.get(id),
    state: { accounts: [{ id: "rental-1", account_type: "rental" }] },
    depositSectionHTML: () => `<p>Held balance: $${held.toFixed(2)}</p>`,
    recordDepositAdjustment: async (...args) => {
      calls.push(args);
      held += 50;
      return true;
    },
  });
  feature.attachEvents();
  await clickHandler({
    target: {
      closest: (selector) => selector === "[data-deposit-adjustment]"
        ? { dataset: { accountId: "rental-1", depositAdjustment: "retained" } }
        : null,
    },
  });
  assert.deepEqual(calls, [["rental-1", "retained"]]);
  assert.match(elements.get("detail-deposit-section").innerHTML, /\$150\.00/);
});

test("account history renders scoped prior terms and escaped void reasons", async () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", "account-history-details.js"), "utf8"),
    context,
  );
  const seenAuditIds = [];
  const state = {
    agreementVersions: [{
      account_id: "account-1",
      reason: "Amendment",
      effective_from: "2026-01-01",
      replaced_on: "2026-02-01",
      created_at: "2026-02-02T12:00:00Z",
      terms: { payment_amount: 550, original_principal: 40000, interest_rate: 5, term_months: 240, party_name: "<Buyer>" },
    }, {
      account_id: "another-account",
      reason: "Should not appear",
      terms: {},
    }],
    payments: [{ id: "payment-1", void_reason: "<duplicate>" }],
    client: {
      from(table) {
        assert.equal(table, "pd_audit_events");
        const query = {
          select(columns) {
            assert.match(columns, /entity_type,entity_id,action/);
            return query;
          },
          in(column, ids) {
            assert.equal(column, "entity_id");
            seenAuditIds.push(...ids);
            return query;
          },
          order(column, options) {
            assert.equal(column, "created_at");
            assert.equal(options.ascending, false);
            return query;
          },
          limit: async (count) => {
            assert.equal(count, 100);
            return {
              data: [{
                entity_type: "pd_payments",
                entity_id: "payment-1",
                action: "voided",
                created_at: "2026-10-01T12:00:00Z",
              }],
              error: null,
            };
          },
        };
        return query;
      },
    },
  };
  const history = context.window.PropertyDeskAccountHistoryDetails.create({
    state,
    esc: (value) => String(value).replaceAll("<", "&lt;").replaceAll(">", "&gt;"),
    money: (value) => `$${Number(value || 0).toFixed(2)}`,
    fmtDate: (value) => value || "—",
  });

  const html = await history.renderAccountHistory(
    { id: "account-1" },
    [{ id: "payment-1" }],
  );

  assert.deepEqual(seenAuditIds, ["account-1", "payment-1"]);
  assert.match(html, /Prior agreement terms/);
  assert.match(html, /Amendment/);
  assert.match(html, /&lt;Buyer&gt;/);
  assert.doesNotMatch(html, /Should not appear/);
  assert.match(html, /Voided payment/);
  assert.match(html, /Reason: &lt;duplicate&gt;/);

  state.client.from = () => { throw new Error("audit unavailable"); };
  const unavailableHTML = await history.renderAccountHistory(
    { id: "account-1" },
    [],
  );
  assert.match(unavailableHTML, /Change history is temporarily unavailable/);
  assert.match(unavailableHTML, /Prior agreement terms/);
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
      documentRef: { addEventListener() {} },
      correctTransaction() {},
      voidTransaction() {},
    });

    assert.equal(typeof feature.attachEvents, "function");
    feature.attachEvents();
    assert.deepEqual([...handlers.keys()], expected);
    assert.ok([...handlers.values()].every((handler) => typeof handler === "function"));
  }
});

test("overview routes property-card and quick-payment actions to property workflows", () => {
  const context = vm.createContext({ window: {} });
  for (const filename of ["overview.js", "overview-events.js"]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
      context,
    );
  }
  const calls = [];
  let clickHandler;
  const events = context.window.PropertyDeskOverviewEvents.create({
    $: () => ({
      addEventListener(name, handler) {
        if (name === "click") clickHandler = handler;
      },
    }),
    openPropertyDetails: (id) => calls.push(["open", id]),
    openPropertyPayment: (id) => calls.push(["payment", id]),
  });
  events.attachEvents();

  for (const [selector, dataset] of [
    ["[data-property-card]", { propertyCard: "property-1" }],
    ["[data-property-payment]", { propertyPayment: "property-2" }],
  ]) {
    clickHandler({
      target: { closest: (value) => value === selector ? { dataset } : null },
      preventDefault() {},
      stopPropagation() {},
    });
  }

  assert.deepEqual(calls, [["open", "property-1"], ["payment", "property-2"]]);
});

test("overview workflow composes dashboard rendering with property actions", () => {
  const received = {};
  const openPropertyDetails = () => {};
  const openPropertyPayment = () => {};
  const context = vm.createContext({
    window: {
      PropertyDeskOverview: {
        create: (options) => {
          received.view = options;
          return { renderOverview: () => "overview" };
        },
      },
      PropertyDeskOverviewEvents: {
        create: (options) => {
          received.events = options;
          return { attachEvents: () => "overview events" };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", "overview-workflow.js"), "utf8"),
    context,
  );
  const workflow = context.window.PropertyDeskOverviewWorkflow.create({
    state: {}, openPropertyDetails, openPropertyPayment,
  });

  assert.ok(received.view.state);
  assert.equal(received.events.openPropertyDetails, openPropertyDetails);
  assert.equal(received.events.openPropertyPayment, openPropertyPayment);
  assert.equal(workflow.renderOverview(), "overview");
  assert.equal(workflow.attachOverviewEvents(), "overview events");
});

test("profile display updates the shared app shell from the current workspace user", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", "profile-display.js"), "utf8"),
    context,
  );
  const elements = new Map();
  const heading = { firstChild: { textContent: "" } };
  const $ = (id) => {
    if (!elements.has(id)) {
      elements.set(id, {
        textContent: "",
        querySelector: () => heading,
      });
    }
    return elements.get(id);
  };
  const feature = context.window.PropertyDeskProfileDisplay.create({
    $,
    state: { user: { email: "owner@example.test", user_metadata: { display_name: "Workspace Owner" } } },
    now: () => ({
      getHours: () => 14,
      toLocaleDateString: () => "Mon, Oct 5",
    }),
  });

  feature.updateGreeting();

  assert.equal(heading.firstChild.textContent, "Good afternoon");
  assert.equal($("greeting-name").textContent, ", Workspace Owner");
  assert.equal($("user-email").textContent, "Workspace Owner");
  assert.equal($("avatar-initial").textContent, "W");
  assert.equal($("user-menu").textContent, "W");
  assert.equal($("today-label").textContent, "Mon, Oct 5");
});

test("profile display loads before overview and is precached", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8");
  assert.ok(
    html.indexOf("features/profile-display.js") < html.indexOf("features/overview.js"),
    "profile display should load before dashboard composition",
  );
  assert.ok(
    html.indexOf("features/overview.js") < html.indexOf("features/overview-workflow.js") &&
      html.indexOf("features/overview-events.js") < html.indexOf("features/overview-workflow.js") &&
      html.indexOf("features/overview-workflow.js") < html.indexOf("app.js"),
    "overview modules should load before their workflow and the app",
  );
  assert.match(worker, /'\.\/features\/profile-display\.js'/);
  assert.match(worker, /'\.\/features\/overview-events\.js'/);
  assert.match(worker, /'\.\/features\/overview-workflow\.js'/);
});

test("profile settings save the display label and refresh the shared shell", async () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", "profile-settings.js"), "utf8"),
    context,
  );
  const messages = [];
  const calls = [];
  const state = {
    user: { id: "owner-1", user_metadata: { display_name: "Old label" } },
    client: {
      auth: {
        updateUser: async (payload) => {
          calls.push(payload);
          return { data: { user: { id: "owner-1", user_metadata: payload.data } }, error: null };
        },
      },
    },
  };
  const feature = context.window.PropertyDeskProfileSettings.create({
    $: () => ({ value: "  Property Manager  " }),
    state,
    toast: (message) => messages.push(message),
    updateGreeting: () => calls.push("refresh-greeting"),
  });

  await feature.saveProfile({ preventDefault() {} });

  assert.equal(calls[0].data.display_name, "Property Manager");
  assert.equal(calls[1], "refresh-greeting");
  assert.equal(state.user.user_metadata.display_name, "Property Manager");
  assert.deepEqual(messages, ["Display name saved"]);
});

test("property view actions route payment, note, address, and add-account actions", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", "property-view-events.js"), "utf8"),
    context,
  );
  const calls = [];
  let clickHandler;
  const elements = new Map();
  const $ = (id) => {
    if (!elements.has(id)) {
      elements.set(id, {
        value: "",
        addEventListener(name, handler) {
          if (id === "properties-table" && name === "click") clickHandler = handler;
        },
      });
    }
    return elements.get(id);
  };
  const feature = context.window.PropertyDeskPropertyViewEvents.create({
    $,
    openPayment: (id) => calls.push(["payment", id]),
    editPropertyQuickNote: (id) => calls.push(["note", id]),
    openPropertyDetails: (id) => calls.push(["open", id]),
    resetAccountForm: () => calls.push(["reset"]),
    populateFormOptions: () => calls.push(["populate"]),
    openModal: (id) => calls.push(["modal", id]),
  });
  feature.attachEvents();

  for (const [selector, dataset] of [
    ["[data-account-payment]", { accountPayment: "account-1" }],
    ["[data-property-note]", { propertyNote: "property-1" }],
    ["[data-property-open]", { propertyOpen: "property-2" }],
    ["[data-property-account]", { propertyAccount: "property-3" }],
  ]) {
    clickHandler({
      target: { closest: (value) => value === selector ? { dataset } : null },
      preventDefault() {},
      stopPropagation() {},
    });
  }

  assert.equal($("account-property").value, "property-3");
  assert.deepEqual(calls, [
    ["payment", "account-1"],
    ["note", "property-1"],
    ["open", "property-2"],
    ["reset"],
    ["populate"],
    ["modal", "account-modal"],
  ]);
});

test("property action router loads after its view and is precached", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8");
  assert.ok(
    html.indexOf("features/property-views.js") < html.indexOf("features/property-view-events.js") &&
      html.indexOf("features/property-view-events.js") < html.indexOf("app.js"),
    "property view should load before its action router and the app",
  );
  assert.match(worker, /'\.\/features\/property-view-events\.js'/);
});

test("transaction action router loads after its view and is precached", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8");
  assert.ok(
    html.indexOf("features/transaction-views.js") < html.indexOf("features/transaction-view-events.js") &&
      html.indexOf("features/transaction-view-events.js") < html.indexOf("app.js"),
    "transaction view should load before its action router and the app",
  );
  assert.match(worker, /'\.\/features\/transaction-view-events\.js'/);
});

test("Properties table templates escape untrusted labels and render visible totals", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", "property-portfolio-table.js"), "utf8"),
    context,
  );
  const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
  const table = context.window.PropertyDeskPropertyPortfolioTable.create({
    esc: escapeHTML,
    money: (value) => `$${Number(value).toFixed(2)}`,
    paymentFrequencyLabel: () => "Monthly",
  });

  const addressHTML = table.propertyAddressCell(
    { id: "<property>", notes: "<repair>" },
    "<10 Oak St>",
  );
  assert.match(addressHTML, /&lt;property&gt;/);
  assert.match(addressHTML, /&lt;repair&gt;/);
  assert.doesNotMatch(addressHTML, /<repair>/);

  const totalsHTML = table.totalsRowHTML({
    unpaidDue: 50,
    scheduledPayment: 125,
    loanBalance: 1000,
    loanCount: 1,
  });
  assert.match(totalsHTML, /\$50\.00/);
  assert.match(totalsHTML, /\$125\.00/);
  assert.match(totalsHTML, /\$1000\.00/);
});

test("transaction action router routes correction and void actions to maintenance", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", "transaction-view-events.js"), "utf8"),
    context,
  );
  const calls = [];
  let clickHandler;
  const feature = context.window.PropertyDeskTransactionViewEvents.create({
    documentRef: {
      addEventListener(name, handler) {
        if (name === "click") clickHandler = handler;
      },
    },
    correctTransaction: (...args) => calls.push(["correct", ...args]),
    voidTransaction: (...args) => calls.push(["void", ...args]),
  });
  feature.attachEvents();

  for (const [selector, dataset] of [
    ["[data-correct-transaction]", { kind: "income", id: "payment-1" }],
    ["[data-void-transaction]", { kind: "expense", id: "expense-1" }],
  ]) {
    clickHandler({
      target: { closest: (value) => value === selector ? { dataset } : null },
    });
  }

  assert.deepEqual(calls, [
    ["correct", "income", "payment-1"],
    ["void", "expense", "expense-1"],
  ]);
});

test("report views summarize the current-year ledger and escape import history", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "ledger-utils.js"), "utf8"),
    context,
  );
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", "report-views.js"), "utf8"),
    context,
  );
  const year = new Date().getFullYear();
  const elements = new Map();
  const $ = (id) => {
    if (!elements.has(id)) elements.set(id, { textContent: "", innerHTML: "" });
    return elements.get(id);
  };
  const esc = (value) => String(value).replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  const feature = context.window.PropertyDeskReportViews.create({
    $,
    state: {
      payments: [
        { amount: 600, received_date: `${year}-02-01`, income_category: "rent", status: "posted" },
        { amount: 900, received_date: `${year}-03-01`, income_category: "deposit", status: "posted" },
        { amount: 75, received_date: `${year}-04-01`, income_category: "rent", status: "voided" },
        { amount: 200, received_date: `${year - 1}-12-01`, income_category: "rent", status: "posted" },
      ],
      expenses: [
        { amount: 100, expense_date: `${year}-02-02`, category: "repair", status: "posted" },
        { amount: 50, expense_date: `${year}-03-02`, category: "deposit_refund", status: "posted" },
        { amount: 20, expense_date: `${year}-04-02`, category: "repair", status: "voided" },
      ],
      accounts: [
        { id: "rental", account_type: "rental" },
        { id: "note", account_type: "note" },
        { id: "contract", account_type: "land_contract" },
      ],
      importBatches: [{
        source_name: "<import>.csv",
        source_type: "accounts",
        created_at: `${year}-02-01T12:00:00Z`,
        rows_accepted: 2,
        rows_total: 3,
        status: "completed",
      }],
    },
    dateOnly: (date) => date ? new Date(`${date}T12:00:00`) : null,
    esc,
    money: (amount) => `$${Number(amount).toFixed(2)}`,
    ...context.PropertyDeskLedgerUtils,
    accountBalance: (account) => account.id === "rental" ? 0 : account.id === "note" ? 1200 : 800,
  });

  feature.renderReports();

  assert.equal($("report-ytd").textContent, "$600.00");
  assert.equal($("report-expenses-ytd").textContent, "$100.00");
  assert.equal($("report-net-ytd").textContent, "$500.00");
  assert.equal($("report-principal").textContent, "$2000.00");
  assert.match($("account-breakdown").innerHTML, />Rentals<\/span>[\s\S]*?\>1<\/strong>/);
  assert.match($("account-breakdown").innerHTML, /Land contracts/);
  assert.match($("account-breakdown").innerHTML, /Private notes/);
  assert.match($("import-history").innerHTML, /&lt;import&gt;\.csv/);
  assert.match($("import-history").innerHTML, /2 of 3/);
});

test("property detail events own editing and quick-action bindings", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", "property-detail-events.js"), "utf8"),
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
  const feature = context.window.PropertyDeskPropertyDetailEvents.create({
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
    savePropertyHolders: () => calls.push("save-holders"),
    openAccountDetails: (id) => calls.push(`open-account:${id}`),
  });

  feature.attachEvents(() => calls.push("archive"));
  handlers.get("property-detail-content:click")({
    target: {
      closest: (selector) =>
        ({
          "[data-edit-account]": { dataset: { editAccount: "account-1" } },
          "[data-save-holders]": { dataset: {} },
          "[data-detail]": { dataset: { detail: "account-1" } },
        })[selector] || null,
    },
    preventDefault() {},
  });
  handlers.get("property-detail-content:click")({
    target: { closest: (selector) => selector === "[data-save-holders]" ? { dataset: {} } : null },
  });
  handlers.get("property-detail-content:click")({
    target: { closest: (selector) => selector === "[data-detail]" ? { dataset: { detail: "account-1" } } : null },
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
    "save-holders",
    "close:property-detail-modal",
    "open-account:account-1",
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

test("property detail events route private document actions to document workflows", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", "property-detail-events.js"), "utf8"),
    context,
  );
  const calls = [];
  const handlers = new Map();
  const feature = context.window.PropertyDeskPropertyDetailEvents.create({
    $: (id) => ({
      addEventListener(name, handler) {
        handlers.set(`${id}:${name}`, handler);
      },
    }),
    state: { accounts: [] },
    closeModal() {}, editAccount() {}, openPayment() {}, openExpense() {},
    resetAccountForm() {}, populateFormOptions() {}, openModal() {},
    savePropertyHolders() {}, openAccountDetails() {},
    openPropertyDocument: (id) => calls.push(["open", id]),
    deletePropertyDocument: (id) => calls.push(["delete", id]),
    uploadPropertyDocument: (input) => calls.push(["upload", input.id]),
  });
  feature.attachEvents(() => {});

  for (const [selector, dataset] of [
    ["[data-open-document]", { openDocument: "document-1" }],
    ["[data-delete-document]", { deleteDocument: "document-2" }],
  ]) {
    handlers.get("property-detail-content:click")({
      target: { closest: (value) => value === selector ? { dataset } : null },
      preventDefault() {},
      stopPropagation() {},
    });
  }
  const input = { id: "agreement-input", matches: (selector) => selector === "[data-property-document]" };
  handlers.get("property-detail-content:change")({ target: input });

  assert.deepEqual(calls, [
    ["open", "document-1"],
    ["delete", "document-2"],
    ["upload", "agreement-input"],
  ]);
});

test("property details workflow connects activity summaries to the property view", () => {
  let detailContext;
  const renderPropertyActivity = () => "activity";
  const context = vm.createContext({
    window: {
      PropertyDeskPropertyActivityDetails: {
        create: () => ({ renderPropertyActivity }),
      },
      PropertyDeskPropertyDetails: {
        create: (options) => {
          detailContext = options;
          return { openPropertyDetails: () => "property details" };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", "property-details-workflow.js"), "utf8"),
    context,
  );
  const workflow = context.window.PropertyDeskPropertyDetailsWorkflow.create({});

  assert.equal(detailContext.renderPropertyActivity, renderPropertyActivity);
  assert.equal(workflow.renderPropertyActivity, renderPropertyActivity);
  assert.equal(workflow.openPropertyDetails(), "property details");
});

test("property actions workflow composes holder, document, and detail event behavior", () => {
  const passed = {};
  const action = () => {};
  const context = vm.createContext({
    window: {
      PropertyDeskPropertyQuickNote: {
        create: () => ({ editPropertyQuickNote: action }),
      },
      PropertyDeskPropertyManagement: {
        create: () => ({ savePropertyHolders: action, toggleArchiveProperty: action }),
      },
      PropertyDeskDocuments: {
        create: () => ({ uploadPropertyDocument: action, deletePropertyDocument: action, openPropertyDocument: action }),
      },
      PropertyDeskPropertyDetailEvents: {
        create: (options) => {
          passed.events = options;
          return { attachEvents: (toggleArchiveProperty) => toggleArchiveProperty };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", "property-actions-workflow.js"), "utf8"),
    context,
  );
  const workflow = context.window.PropertyDeskPropertyActionsWorkflow.create({ documentRef: {} });

  assert.equal(passed.events.savePropertyHolders, action);
  assert.equal(passed.events.deletePropertyDocument, action);
  assert.equal(workflow.editPropertyQuickNote, action);
  assert.equal(workflow.attachPropertyDetailEvents(workflow.toggleArchiveProperty), action);
});
