const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "..");

function loadAccess() {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(path.join(root, "features/app-state-access.js"), "utf8"),
    context,
  );
  return context.window.PropertyDeskAppStateAccess;
}

test("app state accessors expose only the records needed by each feature", () => {
  const records = {
    accounts: [
      { id: "account-1", property_id: "property-1" },
      { id: "account-2", property_id: "property-2" },
    ],
    properties: [{ id: "property-1" }],
    payments: [
      { id: "payment-1", account_id: "account-1" },
      { id: "payment-2", account_id: "account-2" },
    ],
    expenses: [],
    agreementVersions: [
      { id: "agreement-1", account_id: "account-1" },
      { id: "agreement-2", account_id: "account-2" },
    ],
    depositEntries: [{ id: "deposit-1" }],
    auditRequestId: 0,
  };
  const access = loadAccess().create(records);

  assert.deepEqual(Object.keys(access).sort(), [
    "accountDeposit",
    "appShell",
    "backup",
    "createActions",
    "depositContext",
    "financialContext",
    "formOptions",
    "imports",
    "modal",
    "paymentNotifications",
    "properties",
    "propertyAccountForms",
    "reminderPreview",
    "report",
    "startup",
    "transactions",
  ]);
  assert.deepEqual(Object.keys(access.report).sort(), [
    "getAccounts",
    "getExpenses",
    "getImportBatches",
    "getPayments",
    "getProperties",
  ]);
  assert.deepEqual(Object.keys(access.transactions).sort(), [
    "getAccounts",
    "getExpenses",
    "getPayments",
    "getPendingCorrection",
    "getProperties",
    "getWorkspaceOwnerId",
    "setPendingCorrection",
  ]);
  assert.deepEqual(Object.keys(access.paymentNotifications).sort(), [
    "getAccounts",
    "getProperties",
    "getUser",
    "getWorkspaceMembers",
    "getWorkspaceOwnerId",
  ]);
  assert.deepEqual(Object.keys(access.financialContext).sort(), [
    "getAccounts",
    "getPayments",
  ]);
  assert.deepEqual(Object.keys(access.depositContext).sort(), [
    "getDepositEntries",
    "getExpenses",
    "getPayments",
  ]);
  assert.deepEqual(Object.keys(access.accountDeposit).sort(), [
    "beginAuditRequest",
    "getAccount",
    "getAccountCollection",
    "getAgreementVersions",
    "getDepositCollection",
    "getPaymentsForAccount",
    "getProperty",
    "getWorkspaceOwnerId",
    "isCurrentAuditRequest",
  ]);
  assert.equal("setUser" in access.report, false);
  assert.equal("getPendingCorrection" in access.accountDeposit, false);
  assert.equal(
    access.accountDeposit.getAccount("account-1"),
    records.accounts[0],
  );
  assert.equal(access.accountDeposit.getAccount("missing"), null);
  assert.equal(
    access.accountDeposit.getProperty("property-1"),
    records.properties[0],
  );
  assert.deepEqual(
    Array.from(
      access.accountDeposit.getPaymentsForAccount("account-1"),
      ({ id }) => id,
    ),
    ["payment-1"],
  );
  assert.deepEqual(
    Array.from(
      access.accountDeposit.getAgreementVersions("account-2"),
      ({ id }) => id,
    ),
    ["agreement-2"],
  );
  assert.equal(
    access.accountDeposit.getAccountCollection("accounts"),
    records.accounts,
  );
  assert.equal(access.accountDeposit.getAccountCollection("payments"), null);
  assert.equal(
    access.accountDeposit.getDepositCollection("depositEntries"),
    records.depositEntries,
  );
  assert.equal(access.accountDeposit.getDepositCollection("expenses"), null);
  assert.equal(access.accountDeposit.beginAuditRequest(), 1);
  assert.equal(access.accountDeposit.isCurrentAuditRequest(1), true);
  access.properties.beginAuditRequest();
  assert.equal(access.accountDeposit.isCurrentAuditRequest(1), false);

  records.accounts = [{ id: "account-3" }];
  assert.equal(access.report.getAccounts(), records.accounts);
  assert.equal(
    access.accountDeposit.getAccount("account-3"),
    records.accounts[0],
  );
});

test("app state accessors own simple state changes and workspace labels", () => {
  const state = {
    user: { user_metadata: { display_name: "  Jay Abdal " } },
    workspaceOwnerId: "owner-1",
    view: "overview",
    pendingImport: null,
    pendingCorrection: null,
    selectedPropertyId: null,
    passwordRecoveryInProgress: false,
  };
  const access = loadAccess().create(state);

  assert.equal(access.properties.getSenderName(), "Jay Abdal");
  assert.equal(access.appShell.getWorkspaceOwnerId(), "owner-1");
  access.startup.setUser({ user_metadata: {} });
  assert.equal(access.properties.getSenderName(), "PropertyDesk");
  access.appShell.setView("properties");
  access.imports.setPendingImport({ id: "import-1" });
  access.transactions.setPendingCorrection({ id: "payment-1" });
  access.properties.setSelectedPropertyId("property-1");
  access.startup.setPasswordRecoveryInProgress(true);
  assert.equal(state.view, "properties");
  assert.equal(access.imports.getPendingImport().id, "import-1");
  assert.equal(access.transactions.getPendingCorrection().id, "payment-1");
  assert.equal(access.properties.getSelectedPropertyId(), "property-1");
  assert.equal(access.startup.getPasswordRecoveryInProgress(), true);
  assert.equal(Object.isFrozen(access), true);
  for (const group of Object.values(access))
    assert.equal(Object.isFrozen(group), true);
});

test("app state access module loads before the root and is precached", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const appServiceCatalog = fs.readFileSync(
    path.join(root, "features/app-service-module-catalog.js"),
    "utf8",
  );
  const script = "features/app-state-access.js";
  assert.ok(html.indexOf(script) < html.indexOf("app.js"));
  assert.ok(worker.includes(`'./${script}'`));
  assert.match(
    appServiceCatalog,
    /stateAccess: window\.PropertyDeskAppStateAccess/,
  );
  assert.doesNotMatch(app, /\bstate\.[A-Za-z_$]/);
  assert.match(app, /records: stateAccess\.transactions/);
  assert.match(app, /records: stateAccess\.properties/);
});
