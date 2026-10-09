const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("app delegates account, deposit, and transaction maintenance", () => {
  const root = path.join(__dirname, "..");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const browserAdapters = fs.readFileSync(
    path.join(root, "features", "app-browser-adapters.js"),
    "utf8",
  );
  const appServices = fs.readFileSync(
    path.join(root, "features", "app-services.js"),
    "utf8",
  );
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");

  assert.match(
    browserAdapters,
    /confirmAction: \(message\) => windowRef\.confirm\(message\),/,
  );
  assert.match(
    browserAdapters,
    /promptAction: \(message, initialValue\) =>\s*windowRef\.prompt\(message, initialValue\),/,
  );
  assert.match(
    browserAdapters,
    /openWindow: \(\.\.\.args\) => windowRef\.open\(\.\.\.args\),/,
  );
  assert.equal(
    (browserAdapters.match(/windowRef\.confirm\(/g) || []).length,
    1,
  );
  assert.equal((browserAdapters.match(/windowRef\.prompt\(/g) || []).length, 1);
  assert.equal((browserAdapters.match(/windowRef\.open\(/g) || []).length, 1);

  assert.match(app, /PropertyDeskTransactionWorkspaceSetup\.create\(/);
  assert.match(app, /PropertyDeskAccountDepositWorkspaceSetup\.create\(/);
  assert.match(appServices, /modules\.depositContext\.factory\.create\(/);
  assert.doesNotMatch(app, /PropertyDeskTransactionViews\.create\(/);
  assert.doesNotMatch(app, /PropertyDeskLedgerEntryForms\.create\(/);
  assert.doesNotMatch(
    app,
    /PropertyDesk(?:DepositWorkspace|AccountDetailWorkspace)Workflow\.create\(/,
  );
  assert.doesNotMatch(
    app,
    /PropertyDeskAccountDetail(?:Content|Action)Workflow\.create\(/,
  );
  assert.match(
    app,
    /eventBindersBeforeAuth:[\s\S]*?attachTransactionFilterEvents,\s*attachTransactionActionEvents,\s*attachAccountDetailActionEvents,\s*attachDepositAdjustmentEvents,/,
  );

  for (const feature of [
    "account-detail-action-workflow",
    "account-detail-workspace-workflow",
    "account-deposit-workspace-workflow",
    "deposit-adjustment-workflow",
    "deposit-workspace-workflow",
    "workspace-deposit-context",
    "transaction-maintenance-workflow",
    "transaction-workspace-workflow",
    "transaction-workspace-setup",
    "ledger-workflow",
  ]) {
    const script = `features/${feature}.js`;
    assert.ok(
      html.indexOf(script) >= 0 &&
        html.indexOf(script) < html.indexOf("app.js"),
    );
    assert.ok(worker.includes(`'./${script}'`));
  }
});
