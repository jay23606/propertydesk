const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("account detail model separates rental totals from loan schedule data", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "account-details-model.js"),
      "utf8",
    ),
    context,
  );
  const rental = {
    id: "rental-1",
    property_id: "property-1",
    account_type: "rental",
  };
  const note = {
    id: "note-1",
    property_id: "missing-property",
    account_type: "note",
    original_principal: 12000,
    interest_rate: 6,
    term_months: 240,
    start_date: "2025-01-01",
    principal_interest_amount: 85,
  };
  const payment = { account_id: "rental-1", amount: 25, status: "posted" };
  const voided = { account_id: "rental-1", amount: 400, status: "voided" };
  const state = {
    accounts: [rental, note],
    properties: [{ id: "property-1", name: "Rental property" }],
    payments: [payment, voided],
  };
  const scheduleCalls = [];
  const model = context.window.PropertyDeskAccountDetailsModel.create({
    state,
    sumPosted: (rows) =>
      rows
        .filter((row) => row.status === "posted")
        .reduce((total, row) => total + row.amount, 0),
    summarizeAccount: (account) => ({
      unpaidDue: account === rental ? "2026-10-01:2026-10-06" : 0,
      unpaidStart: "2026-10-01",
      loanBalance: account === note ? 700 : 0,
      hasLoanBalance: account !== rental,
    }),
    amortizationSchedule: (...args) => {
      scheduleCalls.push(args);
      return ["on-time schedule"];
    },
    propertyAddress: (property) => property.name || "No property",
  });

  const rentalData = model.buildAccountDetailData(rental.id);
  assert.equal(rentalData.propertyName, "Rental property");
  assert.equal(rentalData.propertyAddressText, "Rental property");
  assert.equal(rentalData.postedPaymentTotal, 25);
  assert.equal(rentalData.estimatedLoanBalance, null);
  assert.equal(rentalData.schedule.length, 0);
  assert.equal(rentalData.unpaidDue, "2026-10-01:2026-10-06");
  assert.equal(rentalData.payments.length, 2);
  assert.equal(rentalData.payments[0], payment);
  assert.equal(rentalData.payments[1], voided);

  const noteData = model.buildAccountDetailData(note.id);
  assert.equal(noteData.propertyName, "—");
  assert.equal(noteData.propertyAddressText, "No property");
  assert.equal(noteData.estimatedLoanBalance, 700);
  assert.deepEqual(noteData.schedule, ["on-time schedule"]);
  assert.deepEqual(scheduleCalls, [[12000, 6, 240, "2025-01-01", 85]]);
  assert.equal(model.buildAccountDetailData("missing-account"), null);
});

test("account details render action targets without owning action listeners", async () => {
  const context = vm.createContext({ window: {} });
  for (const filename of [
    "account-loan-schedule-view.js",
    "account-details-view.js",
    "account-details-model.js",
    "account-details.js",
  ]) {
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
  const state = {
    auditRequestId: 0,
    accounts: [account],
    properties: [{ id: "property-1", name: "Main House" }],
    payments: [
      { id: "paid", account_id: "account-1", amount: 20, status: "posted" },
      {
        id: "voided",
        account_id: "account-1",
        amount: 500,
        status: "voided",
      },
    ],
  };
  const model = context.window.PropertyDeskAccountDetailsModel.create({
    state,
    sumPosted: (rows) =>
      rows
        .filter((payment) => payment.status !== "voided")
        .reduce((total, payment) => total + Number(payment.amount || 0), 0),
    summarizeAccount: () => ({
      unpaidDue: 0,
      unpaidStart: "2026-10-01",
      loanBalance: 0,
      hasLoanBalance: false,
    }),
    amortizationSchedule: () => [],
    propertyAddress: (property) => property.name,
  });
  let renderedViewModel;
  const accountDetailsView =
    context.window.PropertyDeskAccountDetailsView.create({
      money: (value) => "$" + value,
      fmtDate: () => "today",
      esc: String,
      prettyType: (type) => type,
      paymentFrequencyLabel: () => "Monthly",
      accountLoanScheduleHTML: () => "",
    });
  const feature = context.window.PropertyDeskAccountDetails.create({
    $,
    state,
    buildAccountDetailData: model.buildAccountDetailData,
    fmtDate: () => "today",
    openModal() {},
    depositSectionHTML: () => "<p>Held deposit</p>",
    renderAccountHistory: async () => "",
    renderAccountDetails: (data) => {
      renderedViewModel = data;
      return accountDetailsView.renderAccountDetails(data);
    },
  });

  await feature.openAccountDetails(account.id);
  assert.deepEqual(Object.keys(renderedViewModel).sort(), [
    "account",
    "estimatedLoanBalance",
    "historyHTML",
    "payments",
    "postedPaymentTotal",
    "propertyAddressText",
    "propertyName",
    "schedule",
    "unpaidDue",
    "unpaidSinceLabel",
  ]);
  assert.equal("unpaidStart" in renderedViewModel, false);
  assert.match(elements.get("detail-content").innerHTML, /\$20/);
  assert.doesNotMatch(elements.get("detail-content").innerHTML, /\$520/);
  assert.match(
    elements.get("detail-content").innerHTML,
    /data-account-detail-edit="account-1"/,
  );
  assert.match(
    elements.get("detail-content").innerHTML,
    /data-account-detail-payment="account-1"/,
  );
  assert.match(
    elements.get("detail-content").innerHTML,
    /data-account-detail-close="account-1"/,
  );
  assert.equal(
    elements.get("detail-deposit-section").innerHTML,
    "<p>Held deposit</p>",
  );
});

test("account detail view renders estimates and escapes payment history text", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "account-loan-schedule-view.js"),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "account-details-view.js"),
      "utf8",
    ),
    context,
  );
  const scheduleView =
    context.window.PropertyDeskAccountLoanScheduleView.create({
      money: (value) => `$${Number(value).toFixed(2)}`,
      fmtDate: (value) => value || "—",
    });
  const view = context.window.PropertyDeskAccountDetailsView.create({
    money: (value) => `$${Number(value).toFixed(2)}`,
    fmtDate: (value) => value || "—",
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
    prettyType: () => "Private note",
    paymentFrequencyLabel: () => "Monthly",
    accountLoanScheduleHTML: scheduleView.accountLoanScheduleHTML,
  });

  const html = view.renderAccountDetails({
    account: {
      id: "account-1",
      account_type: "note",
      party_name: "<Buyer>",
      payment_amount: 500,
      payment_frequency: "monthly",
      next_due_date: "2026-11-01",
    },
    propertyName: "<Oak House>",
    propertyAddressText: "<Main Street>",
    postedPaymentTotal: 500,
    estimatedLoanBalance: 9000,
    unpaidDue: 0,
    unpaidSinceLabel: "Oct 1, 2026",
    schedule: [
      {
        i: 1,
        date: "2026-11-01",
        payment: 500,
        principal: 400,
        interest: 100,
        balance: 9000,
      },
    ],
    historyHTML: "Prior terms",
    payments: [
      {
        status: "voided",
        received_date: "2026-10-01",
        amount: 500,
        memo: "<duplicate>",
      },
    ],
  });

  assert.match(html, /&lt;Oak House&gt;/);
  assert.match(html, /&lt;Buyer&gt;/);
  assert.match(html, /Estimated amortization schedule/);
  assert.match(html, /Taxes\/insurance escrow is excluded/);
  assert.match(html, /Estimated loan balance · on-time schedule/);
  assert.match(html, /unpaid due tracked since Oct 1, 2026: \$0\.00/);
  assert.match(html, /id="detail-deposit-section"><\/div>/);
  assert.match(html, /Prior terms/);
  assert.match(html, /Voided/);
  assert.match(html, /&lt;duplicate&gt;/);
  assert.doesNotMatch(html, /<duplicate>/);
});

test("account detail event router dispatches edit, payment, and close actions", () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "account-detail-events.js"),
      "utf8",
    ),
    context,
  );
  const account = { id: "account-1" };
  const calls = [];
  let clickHandler;
  const feature = context.window.PropertyDeskAccountDetailEvents.create({
    $: (id) => ({
      id,
      addEventListener: (_event, handler) => {
        clickHandler = handler;
      },
    }),
    state: { accounts: [account] },
    closeModal: (modal) => calls.push(`close:${modal.id}`),
    editAccount: (value) => calls.push(`edit:${value.id}`),
    openPayment: (id) => calls.push(`payment:${id}`),
    closeAccount: (value) => calls.push(`account-close:${value.id}`),
  });
  feature.attachAccountDetailActionEvents();
  const actions = [
    ["[data-account-detail-edit]", { accountDetailEdit: "account-1" }],
    ["[data-account-detail-payment]", { accountDetailPayment: "account-1" }],
    ["[data-account-detail-close]", { accountDetailClose: "account-1" }],
  ];
  for (const [selector, dataset] of actions) {
    clickHandler({
      target: { closest: (value) => (value === selector ? { dataset } : null) },
    });
  }
  assert.deepEqual(calls, [
    "close:detail-modal",
    "edit:account-1",
    "close:detail-modal",
    "payment:account-1",
    "account-close:account-1",
  ]);
});

test("account history renders scoped prior terms and escaped void reasons", async () => {
  const context = vm.createContext({ window: {} });
  for (const filename of [
    "account-history-repository.js",
    "account-history-model.js",
    "account-history-view.js",
  ]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
      context,
    );
  }
  const seenAuditIds = [];
  const state = {
    agreementVersions: [
      {
        account_id: "account-1",
        reason: "Amendment",
        effective_from: "2026-01-01",
        replaced_on: "2026-02-01",
        created_at: "2026-02-02T12:00:00Z",
        terms: {
          payment_amount: 550,
          original_principal: 40000,
          interest_rate: 5,
          term_months: 240,
          party_name: "<Buyer>",
        },
      },
      {
        account_id: "another-account",
        reason: "Should not appear",
        terms: {},
      },
    ],
    payments: [{ id: "payment-1", void_reason: "wrong workspace copy" }],
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
              data: [
                {
                  entity_type: "pd_payments",
                  entity_id: "payment-1",
                  action: "voided",
                  created_at: "2026-10-01T12:00:00Z",
                },
              ],
              error: null,
            };
          },
        };
        return query;
      },
    },
  };
  const esc = (value) =>
    String(value).replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  const money = (value) => `$${Number(value || 0).toFixed(2)}`;
  const fmtDate = (value) => value || "—";
  const { loadAccountHistory } =
    context.window.PropertyDeskAccountHistoryModel.create({
      state,
      repository: context.window.PropertyDeskAccountHistoryRepository.create({
        getClient: () => state.client,
      }),
    });
  const { accountHistoryHTML } =
    context.window.PropertyDeskAccountHistoryView.create({
      esc,
      money,
      fmtDate,
    });
  const renderAccountHistory = async (account, payments) =>
    accountHistoryHTML(await loadAccountHistory(account, payments));

  const html = await renderAccountHistory({ id: "account-1" }, [
    { id: "payment-1", void_reason: "<duplicate>" },
  ]);

  assert.deepEqual(seenAuditIds, ["account-1", "payment-1"]);
  assert.match(html, /Prior agreement terms/);
  assert.match(html, /Amendment/);
  assert.match(html, /&lt;Buyer&gt;/);
  assert.doesNotMatch(html, /Should not appear/);
  assert.match(html, /Voided payment/);
  assert.match(html, /Reason: &lt;duplicate&gt;/);
  assert.doesNotMatch(html, /wrong workspace copy/);

  state.client.from = () => {
    throw new Error("audit unavailable");
  };
  const unavailableHTML = await renderAccountHistory({ id: "account-1" }, []);
  assert.match(unavailableHTML, /Change history is temporarily unavailable/);
  assert.match(unavailableHTML, /Prior agreement terms/);
});

test("account detail content workflow composes schedule, history, and account", async () => {
  const passed = {};
  const accountLoanScheduleHTML = () => "schedule";
  const renderAccountDetails = () => "details";
  const accountHistoryHTML = () => "history";
  const accountHistory = { auditError: false };
  const depositSectionHTML = () => "deposit";
  const openAccountDetails = () => "opened";
  const context = vm.createContext({
    window: {
      PropertyDeskAccountLoanScheduleView: {
        create: (options) => {
          passed.schedule = options;
          return { accountLoanScheduleHTML };
        },
      },
      PropertyDeskAccountDetailsView: {
        create: (options) => {
          passed.view = options;
          return { renderAccountDetails };
        },
      },
      PropertyDeskAccountDetailsModel: {
        create: (options) => {
          passed.model = options;
          return { buildAccountDetailData: () => ({}) };
        },
      },
      PropertyDeskAccountDetails: {
        create: (options) => {
          passed.details = options;
          return { openAccountDetails };
        },
      },
      PropertyDeskAccountHistoryModel: {
        create: (options) => {
          passed.historyModel = options;
          return { loadAccountHistory: async () => accountHistory };
        },
      },
      PropertyDeskAccountHistoryView: {
        create: (options) => {
          passed.historyView = options;
          return { accountHistoryHTML };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "features",
        "account-detail-content-workflow.js",
      ),
      "utf8",
    ),
    context,
  );
  const dependencies = {
    $() {},
    state: {},
    money() {},
    fmtDate() {},
    esc() {},
    sumPosted() {},
    prettyType() {},
    paymentFrequencyLabel() {},
    summarizeAccount() {},
    amortizationSchedule() {},
    openModal() {},
    propertyAddress() {},
    depositSectionHTML,
    accountHistoryRepository: { loadAccountAuditEvents() {} },
  };
  const workflow =
    context.window.PropertyDeskAccountDetailContentWorkflow.create(
      dependencies,
    );

  assert.equal(Object.isFrozen(workflow), true);
  assert.equal(passed.view.accountLoanScheduleHTML, accountLoanScheduleHTML);
  assert.equal(passed.historyModel.state, dependencies.state);
  assert.equal(
    passed.historyModel.repository,
    dependencies.accountHistoryRepository,
  );
  assert.equal(passed.historyView.esc, dependencies.esc);
  assert.equal(passed.model.state, dependencies.state);
  assert.equal(passed.model.sumPosted, dependencies.sumPosted);
  assert.equal(passed.model.summarizeAccount, dependencies.summarizeAccount);
  assert.equal(passed.details.renderAccountDetails, renderAccountDetails);
  assert.equal(typeof passed.details.buildAccountDetailData, "function");
  assert.equal(
    await passed.details.renderAccountHistory({}, []),
    accountHistoryHTML(),
  );
  assert.equal(passed.details.depositSectionHTML, depositSectionHTML);
  assert.deepEqual(Object.keys(workflow).sort(), ["openAccountDetails"]);
  assert.equal(workflow.openAccountDetails, openAccountDetails);
});
