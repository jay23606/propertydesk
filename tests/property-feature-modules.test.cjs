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

test("opening a property delegates modal markup and preserves scoped details", () => {
  const context = vm.createContext({ window: {} });
  for (const filename of ["property-details-view.js", "property-details.js"]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
      context,
    );
  }
  const property = { id: "property-1", name: "<Oak House>", archived_at: null };
  const account = {
    id: "account-1", property_id: property.id, account_type: "note",
    status: "active", name: "<Private Note>", party_name: "Buyer",
    payment_amount: 500, payment_frequency: "monthly",
  };
  const elements = new Map();
  const $ = (id) => {
    if (!elements.has(id)) {
      elements.set(id, { textContent: "", innerHTML: "", disabled: false });
    }
    return elements.get(id);
  };
  const opened = [];
  const activityCalls = [];
  const detailsView = context.window.PropertyDeskPropertyDetailsView.create({
    money: (value) => `$${Number(value).toFixed(2)}`,
    fmtDate: (value) => value,
    esc: (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[char]),
    prettyType: (value) => value,
    paymentFrequencyLabel: () => "Monthly",
    accountBalance: () => 9000,
  });
  const feature = context.window.PropertyDeskPropertyDetails.create({
    $, state: {
      auditRequestId: 0,
      selectedPropertyId: null,
      properties: [property],
      accounts: [account, { id: "elsewhere", property_id: "property-2" }],
      documents: [
        { id: "doc-1", property_id: property.id, file_name: "<agreement>.pdf", created_at: "2026-10-01", content_type: "application/pdf" },
        { id: "other-doc", property_id: "property-2", file_name: "other.pdf" },
      ],
      workspaceMembers: [{ member_user_id: "member-1", display_name: "<Manager>" }],
      propertyHolders: [{ property_id: property.id, member_user_id: "member-1" }],
    },
    openModal: (id) => opened.push(id),
    propertyAddress: () => "Oak House address",
    renderPropertyActivity: (...args) => {
      activityCalls.push(args);
      return { incomeTotal: 600, expenseTotal: 75, html: "<section>Recent activity</section>" };
    },
    propertyDetailsHTML: detailsView.propertyDetailsHTML,
  });

  feature.openPropertyDetails(property.id);

  assert.equal(activityCalls.length, 1);
  assert.equal(activityCalls[0][0], property.id);
  assert.deepEqual(activityCalls[0][1], [account]);
  assert.equal(elements.get("property-detail-title").textContent, property.name);
  assert.equal(elements.get("property-detail-address").textContent, "Oak House address");
  assert.equal(elements.get("property-detail-add-income").disabled, false);
  assert.equal(elements.get("property-archive-toggle").textContent, "Archive property");
  const html = elements.get("property-detail-content").innerHTML;
  assert.match(html, /&lt;Private Note&gt;/);
  assert.match(html, /&lt;Manager&gt;/);
  assert.match(html, /&lt;agreement&gt;\.pdf/);
  assert.match(html, /\$600\.00/);
  assert.match(html, /Recent activity/);
  assert.doesNotMatch(html, /other\.pdf/);
  assert.deepEqual(opened, ["property-detail-modal"]);
});

test("account details render action targets without owning action listeners", async () => {
  const context = vm.createContext({ window: {} });
  for (const filename of ["account-details-view.js", "account-details.js"]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
      context,
    );
  }
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
    renderAccountDetails: context.window.PropertyDeskAccountDetailsView.create({
      money: (value) => `$${value}`,
      fmtDate: () => "today",
      esc: String,
      prettyType: (type) => type,
      paymentFrequencyLabel: () => "Monthly",
    }).renderAccountDetails,
  });

  await feature.openAccountDetails(account.id);
  assert.match(elements.get("detail-content").innerHTML, /data-account-detail-edit="account-1"/);
  assert.match(elements.get("detail-content").innerHTML, /data-account-detail-payment="account-1"/);
  assert.match(elements.get("detail-content").innerHTML, /data-account-detail-close="account-1"/);
});

test("account detail view renders estimates and escapes payment history text", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", "account-details-view.js"), "utf8"),
    context,
  );
  const view = context.window.PropertyDeskAccountDetailsView.create({
    money: (value) => `$${Number(value).toFixed(2)}`,
    fmtDate: (value) => value || "—",
    esc: (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[char]),
    prettyType: () => "Private note",
    paymentFrequencyLabel: () => "Monthly",
  });

  const html = view.renderAccountDetails({
    account: {
      id: "account-1", account_type: "note", party_name: "<Buyer>",
      payment_amount: 500, payment_frequency: "monthly", next_due_date: "2026-11-01",
    },
    propertyName: "<Oak House>",
    propertyAddressText: "<Main Street>",
    postedPaymentTotal: 500,
    estimatedLoanBalance: 9000,
    unpaidDue: 0,
    unpaidSinceLabel: "Oct 1, 2026",
    depositHTML: "Deposit details",
    schedule: [{ i: 1, date: "2026-11-01", payment: 500, principal: 400, interest: 100, balance: 9000 }],
    historyHTML: "Prior terms",
    payments: [{ status: "voided", received_date: "2026-10-01", amount: 500, memo: "<duplicate>" }],
  });

  assert.match(html, /&lt;Oak House&gt;/);
  assert.match(html, /&lt;Buyer&gt;/);
  assert.match(html, /Estimated amortization schedule/);
  assert.match(html, /Taxes\/insurance escrow is excluded/);
  assert.match(html, /Estimated loan balance · on-time schedule/);
  assert.match(html, /unpaid due tracked since Oct 1, 2026: \$0\.00/);
  assert.match(html, /Deposit details/);
  assert.match(html, /Prior terms/);
  assert.match(html, /Voided/);
  assert.match(html, /&lt;duplicate&gt;/);
  assert.doesNotMatch(html, /<duplicate>/);
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
  for (const filename of [
    "property-activity-model.js",
    "property-activity-view.js",
    "property-activity-details.js",
  ]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
      context,
    );
  }
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
    money: (amount) =>
      `$${Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
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

test("property activity model aggregates posted cash flow and sorts eight recent rows", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", "property-activity-model.js"), "utf8"),
    context,
  );
  const state = {
    payments: [
      { account_id: "account-1", amount: 500, received_date: "2026-10-04", status: "posted" },
      { account_id: "other-account", amount: 999, received_date: "2026-10-05", status: "posted" },
    ],
    expenses: Array.from({ length: 9 }, (_, index) => ({
      property_id: "property-1",
      amount: index + 1,
      expense_date: `2026-10-${String(index + 1).padStart(2, "0")}`,
      status: "posted",
      payee: `Vendor ${index + 1}`,
    })),
  };
  const model = context.window.PropertyDeskPropertyActivityModel.create({
    state,
    isPosted: (record) => record.status === "posted",
    sumIncome: (rows) => rows.reduce((total, row) => total + Number(row.amount || 0), 0),
    sumOperatingExpenses: (rows) => rows.reduce((total, row) => total + Number(row.amount || 0), 0),
  });

  const result = model.buildPropertyActivity("property-1", [
    { id: "account-1", name: "Rental" },
  ]);

  assert.equal(result.incomeTotal, 500);
  assert.equal(result.expenseTotal, 45);
  assert.equal(result.transactions.length, 8);
  assert.equal(result.transactions[0].date, "2026-10-09");
  assert.equal(result.transactions[0].amount, -9);
  assert.equal(result.transactions.at(-1).date, "2026-10-03");
});

test("deposit details render rental-only ledger rows and preserve voided markers", () => {
  const context = vm.createContext({ window: {} });
  for (const filename of [
    "deposit-details-model.js",
    "deposit-details-view.js",
    "deposit-details.js",
  ]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
      context,
    );
  }
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
  for (const filename of [
    "account-history-model.js",
    "account-history-view.js",
    "account-history-details.js",
  ]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
      context,
    );
  }
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
    if (file === "transaction-views.js") {
      for (const dependency of [
        "transaction-list-model.js",
        "transaction-row-view.js",
      ]) {
        vm.runInContext(
          fs.readFileSync(path.join(__dirname, "..", "features", dependency), "utf8"),
          context,
        );
      }
    }
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

test("overview renderer displays its summary model and quick-payment card", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", "overview.js"), "utf8"),
    context,
  );
  const elements = new Map();
  const $ = (id) => {
    if (!elements.has(id)) elements.set(id, { textContent: "", innerHTML: "" });
    return elements.get(id);
  };
  const property = {
    id: "property-1",
    name: "One Oak",
    address: "1 Oak St",
    property_kind: "residential",
  };
  const feature = context.window.PropertyDeskOverview.create({
    $,
    esc: String,
    prettyKind: String,
    money: (amount) => `$${Number(amount).toFixed(2)}`,
    propertyAddress: (record) => record.address,
    prettyType: String,
    fmtDate: String,
    overviewModel: {
      buildOverview: () => ({
        propertyCount: 1,
        accountCount: 2,
        collected: 800,
        expected: 1300,
        recordedPaymentCount: 1,
        upcoming: [],
        recent: [],
        propertyCards: [
          {
            property,
            parties: "Alice Buyer",
            scheduledMonthly: 550,
            hasNonMonthly: false,
            loanBalance: 42000,
            hasLoanAccount: true,
            amountDue: 550,
          },
        ],
      }),
    },
  });

  feature.renderOverview();

  assert.equal($("stat-properties").textContent, 1);
  assert.equal($("stat-accounts").textContent, 2);
  assert.equal($("stat-collected").textContent, "$800.00");
  assert.equal($("stat-expected").textContent, "$1300.00");
  assert.match($("overview-properties").innerHTML, /1 Oak St/);
  assert.match($("overview-properties").innerHTML, /Alice Buyer/);
  assert.match($("overview-properties").innerHTML, /data-property-payment="property-1"/);
  assert.match($("overview-properties").innerHTML, /\$42000\.00/);
  assert.match($("upcoming-list").innerHTML, /No upcoming payments yet/);
});

test("overview workflow composes dashboard rendering with property actions", () => {
  const received = {};
  const modelContext = {
    state: {},
    monthlyScheduledEstimate: () => 0,
    accountBalance: () => 0,
    amountDueSince: () => 0,
    unpaidDueAccrualStart: () => "2026-10-01",
    todayIso: () => "2026-10-05",
    collectedSince: () => 0,
    scheduledMonthlyRunRate: () => 0,
    monthStart: () => "2026-10-01",
    isPosted: () => true,
  };
  const viewContext = {
    $: () => {},
    esc: String,
    prettyKind: String,
    money: String,
    propertyAddress: String,
    prettyType: String,
    fmtDate: String,
  };
  const overviewModel = { buildOverview: () => ({}) };
  const openPropertyDetails = () => {};
  const openPropertyPayment = () => {};
  const context = vm.createContext({
    window: {
      PropertyDeskOverviewModel: {
        create: (options) => {
          received.model = options;
          return overviewModel;
        },
      },
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
    ...modelContext, ...viewContext, openPropertyDetails, openPropertyPayment,
  });

  assert.deepEqual(
    Object.keys(received.view).sort(),
    [...Object.keys(viewContext), "overviewModel"].sort(),
  );
  for (const [key, value] of Object.entries(viewContext)) {
    assert.equal(received.view[key], value);
  }
  assert.deepEqual(Object.keys(received.model).sort(), Object.keys(modelContext).sort());
  for (const [key, value] of Object.entries(modelContext)) {
    assert.equal(received.model[key], value);
  }
  assert.equal(received.view.overviewModel, overviewModel);
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
    html.indexOf("features/overview-model.js") < html.indexOf("features/overview.js") &&
      html.indexOf("features/overview-model.js") < html.indexOf("features/overview-workflow.js") &&
    html.indexOf("features/overview.js") < html.indexOf("features/overview-workflow.js") &&
      html.indexOf("features/overview-events.js") < html.indexOf("features/overview-workflow.js") &&
      html.indexOf("features/overview-workflow.js") < html.indexOf("app.js"),
    "overview modules should load before their workflow and the app",
  );
  assert.match(worker, /'\.\/features\/profile-display\.js'/);
  assert.match(worker, /'\.\/features\/overview-model\.js'/);
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
  for (const filename of ["report-model.js", "report-views.js"]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
      context,
    );
  }
  const year = new Date().getFullYear();
  const elements = new Map();
  const $ = (id) => {
    if (!elements.has(id)) elements.set(id, { textContent: "", innerHTML: "" });
    return elements.get(id);
  };
  const esc = (value) => String(value).replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  const state = {
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
  };
  const dateOnly = (date) => date ? new Date(`${date}T12:00:00`) : null;
  const accountBalance = (account) => account.id === "rental" ? 0 : account.id === "note" ? 1200 : 800;
  const reportModel = context.window.PropertyDeskReportModel.create({
    state,
    dateOnly,
    sumIncome: (rows) => rows.reduce((total, payment) => payment.status === "posted" && payment.income_category !== "deposit" ? total + Number(payment.amount || 0) : total, 0),
    sumOperatingExpenses: (rows) => rows.reduce((total, expense) => expense.status === "posted" && expense.category !== "deposit_refund" ? total + Number(expense.amount || 0) : total, 0),
    accountBalance,
  });
  const feature = context.window.PropertyDeskReportViews.create({
    $,
    esc,
    money: (amount) => `$${Number(amount).toFixed(2)}`,
    buildReportModel: reportModel.buildReportModel,
  });

  const model = reportModel.buildReportModel(year);
  feature.renderReports();

  assert.equal(model.income, 600);
  assert.equal(model.costs, 100);
  assert.equal(model.principal, 2000);
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
  for (const filename of ["property-detail-events.js", "property-detail-quick-actions.js"]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
      context,
    );
  }
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
    savePropertyHolders: () => calls.push("save-holders"),
    openAccountDetails: (id) => calls.push(`open-account:${id}`),
  });
  const quickActionState = { selectedPropertyId: "property-1" };
  const quickActions = context.window.PropertyDeskPropertyDetailQuickActions.create({
    $: getElement,
    state: quickActionState,
    closeModal: (modal) => calls.push(`close:${modal.id}`),
    openPayment: (...args) => calls.push(`payment:${args.join(":")}`),
    openExpense: (propertyId) => calls.push(`expense:${propertyId}`),
    resetAccountForm: () => calls.push("reset-account"),
    populateFormOptions: () => calls.push("populate-options"),
    openModal: (id) => calls.push(`open:${id}`),
  });

  feature.attachEvents();
  quickActions.attachEvents(() => calls.push("archive"));
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
  const callsBeforeNoSelection = calls.length;
  quickActionState.selectedPropertyId = null;
  handlers.get("property-detail-add-income:click")();
  handlers.get("property-detail-add-expense:click")();
  handlers.get("property-detail-add-account:click")();
  assert.equal(calls.length, callsBeforeNoSelection);
});

test("property detail events route private document actions to document workflows", () => {
  const context = vm.createContext({ window: {} });
  for (const filename of ["property-detail-events.js", "property-detail-quick-actions.js"]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
      context,
    );
  }
  const calls = [];
  const handlers = new Map();
  const feature = context.window.PropertyDeskPropertyDetailEvents.create({
    $: (id) => ({
      addEventListener(name, handler) {
        handlers.set(`${id}:${name}`, handler);
      },
    }),
    state: { accounts: [] },
    closeModal() {}, editAccount() {},
    savePropertyHolders() {}, openAccountDetails() {},
    openPropertyDocument: (id) => calls.push(["open", id]),
    deletePropertyDocument: (id) => calls.push(["delete", id]),
    uploadPropertyDocument: (input) => calls.push(["upload", input.id]),
  });
  feature.attachEvents();

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
  let viewContext;
  const renderPropertyActivity = () => "activity";
  const propertyDetailsHTML = () => "property details html";
  const context = vm.createContext({
    window: {
      PropertyDeskPropertyDetailsView: {
        create: (options) => {
          viewContext = options;
          return { propertyDetailsHTML };
        },
      },
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
  const detailsDependencies = {
    money() {}, fmtDate() {}, esc() {}, prettyType() {},
    paymentFrequencyLabel() {}, accountBalance() {},
  };
  const workflow = context.window.PropertyDeskPropertyDetailsWorkflow.create(detailsDependencies);

  assert.deepEqual(Object.keys(viewContext).sort(), Object.keys(detailsDependencies).sort());
  assert.equal(detailContext.propertyDetailsHTML, propertyDetailsHTML);
  assert.equal(detailContext.renderPropertyActivity, renderPropertyActivity);
  assert.equal(workflow.renderPropertyActivity, renderPropertyActivity);
  assert.equal(workflow.openPropertyDetails(), "property details");
});

test("property actions workflow composes holder, document, and detail event behavior", () => {
  const passed = {};
  const action = () => {};
  const attachCalls = [];
  const context = vm.createContext({
    window: {
      PropertyDeskPropertyQuickNote: {
        create: () => ({ editPropertyQuickNote: action }),
      },
      PropertyDeskPropertyHolderManagement: {
        create: () => ({ savePropertyHolders: action }),
      },
      PropertyDeskPropertyArchive: {
        create: () => ({ toggleArchiveProperty: action }),
      },
      PropertyDeskDocuments: {
        create: (options) => { passed.documents = options; return { uploadPropertyDocument: action, deletePropertyDocument: action, openPropertyDocument: action }; },
      },
      PropertyDeskDocumentRepository: {
        create: (client) => { passed.repositoryClient = client; return { mocked: true }; },
      },
      PropertyDeskPropertyDetailEvents: {
        create: (options) => {
          passed.events = options;
          return { attachEvents: () => attachCalls.push("content") };
        },
      },
      PropertyDeskPropertyDetailQuickActions: {
        create: (options) => {
          passed.quickActions = options;
          return { attachEvents: (toggleArchiveProperty) => attachCalls.push(toggleArchiveProperty) };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", "property-actions-workflow.js"), "utf8"),
    context,
  );
  const state = { client: {} };
  const quickActionDependencies = {
    state,
    closeModal: action,
    openPayment: action,
    openExpense: action,
    resetAccountForm: action,
    populateFormOptions: action,
    openModal: action,
  };
  const workflow = context.window.PropertyDeskPropertyActionsWorkflow.create({
    ...quickActionDependencies,
    documentRef: {},
  });

  assert.equal(passed.events.savePropertyHolders, action);
  assert.equal(passed.events.deletePropertyDocument, action);
  assert.equal(passed.quickActions.openPayment, action);
  assert.equal(passed.quickActions.openExpense, action);
  assert.equal(passed.documents.repository.mocked, true);
  assert.equal(passed.repositoryClient, state.client);
  assert.equal(workflow.editPropertyQuickNote, action);
  workflow.attachPropertyDetailEvents(workflow.toggleArchiveProperty);
  assert.deepEqual(attachCalls, ["content", workflow.toggleArchiveProperty]);
});
