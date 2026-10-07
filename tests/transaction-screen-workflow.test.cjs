const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("transaction screen workflow joins view rendering and maintenance actions", () => {
  const passed = {};
  const renderPayments = () => {};
  const attachViewEvents = () => {};
  const attachActionEvents = () => {};
  const context = vm.createContext({
    window: {
      PropertyDeskTransactionViews: {
        create(dependencies) {
          passed.view = dependencies;
          return { renderPayments, attachEvents: attachViewEvents };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "transaction-screen-workflow.js"),
      "utf8",
    ),
    context,
  );
  const transactionMaintenance = {
    createActionHandlers(dependencies) {
      passed.actions = dependencies;
      return { attachTransactionActionEvents: attachActionEvents };
    },
  };
  const dependencies = {
    $() {},
    state: {},
    dateOnly() {},
    fmtDate() {},
    esc() {},
    expenseCategoryLabel() {},
    money() {},
    postedOnOrAfter() {},
    monthStart() {},
    sumIncome() {},
    sumOperatingExpenses() {},
    transactionMaintenance,
    openPayment() {},
    openExpense() {},
    updatePaymentGuidance() {},
  };
  const workflow =
    context.window.PropertyDeskTransactionScreenWorkflow.create(dependencies);

  assert.equal(passed.view.state, dependencies.state);
  assert.equal(passed.actions.openPayment, dependencies.openPayment);
  assert.equal(passed.actions.openExpense, dependencies.openExpense);
  assert.equal(
    passed.actions.updatePaymentGuidance,
    dependencies.updatePaymentGuidance,
  );
  assert.deepEqual(Object.keys(workflow).sort(), [
    "attachTransactionActionEvents",
    "attachTransactionViewEvents",
    "renderPayments",
  ]);
  assert.equal(workflow.renderPayments, renderPayments);
  assert.equal(workflow.attachTransactionViewEvents, attachViewEvents);
  assert.equal(workflow.attachTransactionActionEvents, attachActionEvents);
});

test("app delegates the Transactions screen and precaches its coordinator", () => {
  const root = path.join(__dirname, "..");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const workflow = "features/transaction-workspace-workflow.js";

  assert.match(app, /PropertyDeskTransactionWorkspaceWorkflow\.create\(/);
  assert.doesNotMatch(app, /PropertyDeskTransactionScreenWorkflow\.create\(/);
  assert.doesNotMatch(app, /PropertyDeskTransactionViews\.create\(/);
  assert.doesNotMatch(app, /transactionMaintenance\.createActionHandlers\(/);
  assert.ok(html.indexOf(workflow) < html.indexOf("app.js"));
  assert.ok(
    html.indexOf("features/transaction-screen-workflow.js") <
      html.indexOf(workflow),
  );
  assert.ok(worker.includes("'./" + workflow + "'"));
});
