const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("account details render action targets without owning action listeners", async () => {
  const context = vm.createContext({ window: {} });
  for (const filename of [
    "account-loan-schedule-view.js",
    "account-details-view.js",
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
  const feature = context.window.PropertyDeskAccountDetails.create({
    $,
    state: {
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
    },
    sumPosted: (rows) =>
      rows
        .filter((payment) => payment.status !== "voided")
        .reduce((total, payment) => total + Number(payment.amount || 0), 0),
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
      accountLoanScheduleHTML: () => "",
    }).renderAccountDetails,
  });

  await feature.openAccountDetails(account.id);
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
    depositHTML: "Deposit details",
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
  assert.match(html, /Deposit details/);
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
  feature.attachEvents();
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
    "account-history-audit.js",
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
  const history = context.window.PropertyDeskAccountHistoryDetails.create({
    state,
    esc: (value) =>
      String(value).replaceAll("<", "&lt;").replaceAll(">", "&gt;"),
    money: (value) => `$${Number(value || 0).toFixed(2)}`,
    fmtDate: (value) => value || "—",
  });

  const html = await history.renderAccountHistory({ id: "account-1" }, [
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
  const unavailableHTML = await history.renderAccountHistory(
    { id: "account-1" },
    [],
  );
  assert.match(unavailableHTML, /Change history is temporarily unavailable/);
  assert.match(unavailableHTML, /Prior agreement terms/);
});
