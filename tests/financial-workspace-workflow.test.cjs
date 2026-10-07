const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("app delegates account, deposit, and transaction maintenance", () => {
  const root = path.join(__dirname, "..");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");

  assert.match(app, /PropertyDeskTransactionMaintenanceWorkflow\.create\(/);
  assert.match(app, /PropertyDeskTransactionScreenWorkflow\.create\(/);
  assert.match(app, /PropertyDeskAccountScreenWorkflow\.create\(/);
  assert.match(
    app,
    /AccountScreenWorkflow\.create\(\{[\s\S]*?maintenance: \{[\s\S]*?closeModal,[\s\S]*?editAccount,[\s\S]*?openPayment,[\s\S]*?moneyInput,/,
  );
  assert.match(
    app,
    /eventBindersBeforeAuth:[\s\S]*?attachTransactionViewEvents,\s*attachTransactionActionEvents,\s*attachAccountDetailActionEvents,\s*attachDepositEvents,/,
  );

  for (const feature of [
    "account-deposit-maintenance-workflow",
    "account-screen-workflow",
    "transaction-maintenance-workflow",
    "transaction-screen-workflow",
  ]) {
    const script = `features/${feature}.js`;
    assert.ok(
      html.indexOf(script) >= 0 &&
        html.indexOf(script) < html.indexOf("app.js"),
    );
    assert.ok(worker.includes(`'./${script}'`));
  }
});
