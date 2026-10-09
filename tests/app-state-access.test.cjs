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

test("app state accessors stay live and scope account-related records", () => {
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

  assert.equal(access.getAccount("account-1"), records.accounts[0]);
  assert.equal(access.getAccount("missing"), null);
  assert.equal(access.getProperty("property-1"), records.properties[0]);
  assert.deepEqual(
    Array.from(access.getPaymentsForAccount("account-1"), ({ id }) => id),
    ["payment-1"],
  );
  assert.deepEqual(
    Array.from(access.getAgreementVersions("account-2"), ({ id }) => id),
    ["agreement-2"],
  );
  assert.equal(access.getAccountCollection("accounts"), records.accounts);
  assert.equal(access.getAccountCollection("payments"), null);
  assert.equal(
    access.getDepositCollection("depositEntries"),
    records.depositEntries,
  );
  assert.equal(access.getDepositCollection("expenses"), null);
  assert.equal(access.beginAuditRequest(), 1);
  assert.equal(access.isCurrentAuditRequest(1), true);
  access.beginAuditRequest();
  assert.equal(access.isCurrentAuditRequest(1), false);

  records.accounts = [{ id: "account-3" }];
  assert.equal(access.getAccounts(), records.accounts);
  assert.equal(access.getAccount("account-3"), records.accounts[0]);
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

  assert.equal(access.getSenderName(), "Jay Abdal");
  assert.equal(access.getWorkspaceOwnerId(), "owner-1");
  access.setUser({ user_metadata: {} });
  assert.equal(access.getSenderName(), "PropertyDesk");
  access.setView("properties");
  access.setPendingImport({ id: "import-1" });
  access.setPendingCorrection({ id: "payment-1" });
  access.setSelectedPropertyId("property-1");
  access.setPasswordRecoveryInProgress(true);
  assert.equal(access.getView(), "properties");
  assert.equal(access.getPendingImport().id, "import-1");
  assert.equal(access.getPendingCorrection().id, "payment-1");
  assert.equal(access.getSelectedPropertyId(), "property-1");
  assert.equal(access.getPasswordRecoveryInProgress(), true);
  assert.equal(Object.isFrozen(access), true);
});

test("app state access module loads before the root and is precached", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const script = "features/app-state-access.js";
  assert.ok(html.indexOf(script) < html.indexOf("app.js"));
  assert.ok(worker.includes(`'./${script}'`));
  assert.match(app, /PropertyDeskAppStateAccess\.create\(state\)/);
  assert.doesNotMatch(app, /\bstate\.[A-Za-z_$]/);
});
