const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("transaction history workflow exposes view rendering and filters", () => {
  const passed = {};
  const renderPayments = () => "rendered";
  const attachEvents = () => "attached";
  const context = vm.createContext({
    window: {
      PropertyDeskTransactionViews: {
        create: (options) => {
          passed.options = options;
          return { renderPayments, attachEvents };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "transaction-history-workflow.js"),
      "utf8",
    ),
    context,
  );

  const dependencies = { state: {}, money: () => {} };
  const workflow =
    context.window.PropertyDeskTransactionHistoryWorkflow.create(dependencies);

  assert.equal(passed.options, dependencies);
  assert.equal(workflow.renderPayments, renderPayments);
  assert.equal(workflow.attachTransactionViewEvents, attachEvents);
});

test("app composes transaction history separately from record entry", () => {
  const root = path.join(__dirname, "..");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");

  assert.match(app, /PropertyDeskTransactionHistoryWorkflow\.create\(/);
  assert.match(app, /PropertyDeskRecordEntryWorkflow\.create\(/);
  assert.doesNotMatch(app, /PropertyDeskLedgerWorkflow/);
  assert.doesNotMatch(html, /features\/ledger-workflow\.js/);
  assert.doesNotMatch(worker, /features\/ledger-workflow\.js/);
  assert.ok(
    html.indexOf("features/transaction-views.js") <
      html.indexOf("features/transaction-history-workflow.js") &&
      html.indexOf("features/transaction-history-workflow.js") <
        html.indexOf("app.js"),
  );
  assert.match(worker, /'\.\/features\/transaction-history-workflow\.js'/);
});
