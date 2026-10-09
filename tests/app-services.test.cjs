const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("app services compose shared runtime and financial services explicitly", () => {
  const calls = [];
  const context = vm.createContext({ window: {} });
  const api = (name, result = {}) => ({
    create(options) {
      calls.push([name, options]);
      return result;
    },
  });
  const state = {
    accounts: [],
    payments: [],
    depositEntries: [],
    expenses: [],
    workspaceOwnerId: "owner-1",
    user: { id: "viewer-1" },
    workspaceMembers: [
      {
        member_user_id: "member-1",
        display_name: "Member Name",
        email: "member@example.test",
        unrelated_private_field: "omit this",
      },
    ],
    properties: [
      {
        id: "property-1",
        address: "12 Main St",
        city: "Altoona",
        state: "PA",
        postal_code: "16601",
        unrelated_private_field: "omit this too",
      },
    ],
  };
  const client = {};
  const fetchAll = () => {};
  const getClient = () => client;
  const writeFeedback = {};
  const emailUtils = {};
  const postedLedgerUtils = { isPosted() {} };
  const toast = () => {};
  const paymentNotifications = {};
  const financialContext = {};
  const depositLedger = {};
  const currencyUtils = { roundCurrency() {} };
  const dateUtils = { todayIso() {} };
  const money = () => {};
  const propertyAddress = () => {};
  const reconciliation = {};
  const recordWrites = {};
  const emailAddressUtils = {};
  const reminderCopy = {};
  const repositories = {};
  const tables = {};
  const runtimeWorkflows = {};
  const financialWorkflows = {};
  const depositWorkflows = {};
  const $ = () => {};
  const reportError = () => {};
  const config = { supabaseUrl: "https://example.test" };
  const supabase = {};
  const modules = {
    writeFeedback: {
      factory: api("write-feedback", writeFeedback),
      reconciliation,
      recordWrites,
    },
    emailUtils: {
      factory: api("email-utils", emailUtils),
      emailAddressUtils,
      reminderCopy,
    },
    postedLedger: {
      factory: api("posted-ledger", postedLedgerUtils),
      currencyUtils,
    },
    notifications: api("notifications", { toast }),
    workspaceRuntime: {
      factory: api("workspace-runtime", {
        backendConfigured: true,
        state,
        fetchAll,
        loadAllWorkspacePages() {},
        repositories,
        setRender() {},
        authClient: {},
        initializeClient() {},
        getClient,
        isClientReady() {},
      }),
      repositories,
      tables,
      workflows: runtimeWorkflows,
    },
    paymentNotifications: api("payment-notifications", paymentNotifications),
    displayUtils: { money },
    propertyAddressUtils: { propertyAddress },
    dateUtils,
    currencyUtils,
    accountStatusUtils: { isActiveAccount() {} },
    financialContext: {
      factory: api("financial-context", financialContext),
      workflows: financialWorkflows,
    },
    depositContext: {
      factory: api("deposit-context", { depositLedger }),
      workflows: depositWorkflows,
    },
  };

  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "app-services.js"),
      "utf8",
    ),
    context,
  );

  const services = context.window.PropertyDeskAppServices.create({
    $,
    config,
    supabase,
    reportError,
    modules,
  });

  assert.equal(Object.isFrozen(services), true);
  assert.equal("getClient" in services, false);
  assert.deepEqual(Object.keys(services).sort(), [
    "authClient",
    "backendConfigured",
    "depositLedger",
    "emailUtils",
    "fetchAll",
    "financialContext",
    "initializeClient",
    "isClientReady",
    "loadAllWorkspacePages",
    "paymentNotifications",
    "repositories",
    "setRender",
    "state",
    "toast",
    "writeFeedback",
  ]);
  assert.equal(services.writeFeedback, writeFeedback);
  assert.equal(services.emailUtils, emailUtils);
  assert.equal("postedLedgerUtils" in services, false);
  assert.equal(services.toast, toast);
  assert.equal(services.state, state);
  assert.equal(services.repositories, repositories);
  assert.equal(services.paymentNotifications, paymentNotifications);
  assert.equal(services.financialContext, financialContext);
  assert.equal(services.depositLedger, depositLedger);
  assert.deepEqual(
    calls.map(([name]) => name),
    [
      "write-feedback",
      "email-utils",
      "posted-ledger",
      "notifications",
      "workspace-runtime",
      "payment-notifications",
      "financial-context",
      "deposit-context",
    ],
  );
  assert.equal(calls[0][1].modules.reconciliation, reconciliation);
  assert.equal(calls[0][1].modules.recordWrites, recordWrites);
  assert.equal(calls[1][1].modules.emailAddressUtils, emailAddressUtils);
  assert.equal(calls[1][1].modules.reminderCopy, reminderCopy);
  assert.equal(calls[2][1].roundCurrency, currencyUtils.roundCurrency);
  assert.deepEqual(Object.keys(calls[2][1]), ["roundCurrency"]);
  assert.equal(calls[3][1].$, $);
  assert.equal(calls[4][1].config, config);
  assert.equal(calls[4][1].supabase, supabase);
  assert.equal(calls[4][1].repositories, repositories);
  assert.equal(calls[4][1].toast, toast);
  assert.equal(calls[4][1].reportError, reportError);
  assert.equal(calls[4][1].tables, tables);
  assert.equal(calls[4][1].workflows, runtimeWorkflows);
  assert.deepEqual(
    JSON.parse(JSON.stringify(calls[5][1].getWorkspaceIdentity())),
    {
      ownerId: "owner-1",
      viewerId: "viewer-1",
    },
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(calls[5][1].getPaymentNotificationData())),
    {
      members: [
        {
          member_user_id: "member-1",
          display_name: "Member Name",
          email: "member@example.test",
        },
      ],
      accounts: [],
      properties: [
        {
          id: "property-1",
          address: "12 Main St",
          city: "Altoona",
          state: "PA",
          postal_code: "16601",
        },
      ],
    },
  );
  assert.deepEqual(Object.keys(calls[5][1]).sort(), [
    "getClient",
    "getPaymentNotificationData",
    "getWorkspaceIdentity",
    "money",
    "propertyAddress",
    "refresh",
    "toast",
  ]);
  assert.equal(calls[5][1].getClient, getClient);
  assert.equal(calls[5][1].toast, toast);
  assert.equal(calls[5][1].money, money);
  assert.equal(calls[5][1].propertyAddress, propertyAddress);
  assert.equal(calls[5][1].refresh, fetchAll);
  assert.equal(calls[6][1].getAccounts(), state.accounts);
  assert.equal(calls[6][1].getPayments(), state.payments);
  assert.deepEqual(Object.keys(calls[6][1]).sort(), [
    "currencyUtils",
    "dateUtils",
    "getAccounts",
    "getPayments",
    "isActiveAccount",
    "postedLedgerUtils",
    "todayIso",
    "workflows",
  ]);
  assert.equal(calls[6][1].todayIso, dateUtils.todayIso);
  assert.equal(calls[6][1].postedLedgerUtils, postedLedgerUtils);
  assert.equal(calls[6][1].workflows, financialWorkflows);
  assert.equal(calls[7][1].getDepositEntries(), state.depositEntries);
  assert.equal(calls[7][1].getPayments(), state.payments);
  assert.equal(calls[7][1].getExpenses(), state.expenses);
  assert.deepEqual(Object.keys(calls[7][1]).sort(), [
    "getDepositEntries",
    "getExpenses",
    "getPayments",
    "postedLedgerUtils",
    "workflows",
  ]);
  assert.equal(calls[7][1].postedLedgerUtils, postedLedgerUtils);
  assert.equal(calls[7][1].workflows, depositWorkflows);
});

test("app services load before the app root and are in the PWA shell", () => {
  const root = path.join(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  assert.ok(html.indexOf("features/app-services.js") < html.indexOf("app.js"));
  assert.match(worker, /'\.\/features\/app-services\.js'/);
});
