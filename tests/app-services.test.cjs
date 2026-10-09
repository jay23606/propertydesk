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
  const state = { accounts: [] };
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
  const currencyUtils = {};
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
  assert.equal(services.writeFeedback, writeFeedback);
  assert.equal(services.emailUtils, emailUtils);
  assert.equal(services.postedLedgerUtils, postedLedgerUtils);
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
  assert.equal(calls[2][1].modules.currencyUtils, currencyUtils);
  assert.equal(calls[3][1].$, $);
  assert.equal(calls[4][1].config, config);
  assert.equal(calls[4][1].supabase, supabase);
  assert.equal(calls[4][1].repositories, repositories);
  assert.equal(calls[4][1].toast, toast);
  assert.equal(calls[4][1].reportError, reportError);
  assert.equal(calls[4][1].tables, tables);
  assert.equal(calls[4][1].workflows, runtimeWorkflows);
  assert.equal(calls[5][1].state, state);
  assert.equal(calls[5][1].getClient, getClient);
  assert.equal(calls[5][1].toast, toast);
  assert.equal(calls[5][1].money, money);
  assert.equal(calls[5][1].propertyAddress, propertyAddress);
  assert.equal(calls[5][1].refresh, fetchAll);
  assert.equal(calls[6][1].state, state);
  assert.equal(calls[6][1].todayIso, dateUtils.todayIso);
  assert.equal(calls[6][1].postedLedgerUtils, postedLedgerUtils);
  assert.equal(calls[6][1].workflows, financialWorkflows);
  assert.equal(calls[7][1].state, state);
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
