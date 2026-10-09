const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "..");

test("app service module catalog groups only service composition dependencies", () => {
  const source = fs.readFileSync(
    path.join(root, "features/app-service-module-catalog.js"),
    "utf8",
  );
  const moduleNames = [
    ...new Set(
      [...source.matchAll(/window\.(PropertyDesk[A-Za-z]+)/g)]
        .map((match) => match[1])
        .filter((name) => name !== "PropertyDeskAppServiceModuleCatalog"),
    ),
  ];
  const window = Object.fromEntries(
    moduleNames.map((name) => [name, Object.freeze({ name })]),
  );
  const context = vm.createContext({ window });
  vm.runInContext(source, context);

  const catalog = window.PropertyDeskAppServiceModuleCatalog.create();

  assert.equal(Object.isFrozen(catalog), true);
  assert.deepEqual(Object.keys(catalog).sort(), [
    "accountStatusUtils",
    "currencyUtils",
    "dateUtils",
    "depositContext",
    "displayUtils",
    "emailUtils",
    "financialContext",
    "notifications",
    "paymentNotificationSetup",
    "paymentNotifications",
    "postedLedger",
    "propertyAddressUtils",
    "stateAccess",
    "workspaceRuntime",
    "writeFeedback",
  ]);
  assert.equal(
    catalog.workspaceRuntime.factory,
    window.PropertyDeskWorkspaceRuntime,
  );
  assert.equal(
    catalog.workspaceRuntime.repositories.transactions,
    window.PropertyDeskTransactionRepository,
  );
  assert.equal(
    catalog.workspaceRuntime.workflows.refresh,
    window.PropertyDeskWorkspaceRefresh,
  );
  assert.equal(
    catalog.financialContext.workflows.accountSummary,
    window.PropertyDeskAccountFinancialSummary,
  );
  assert.equal(
    catalog.depositContext.workflows.depositLedger,
    window.PropertyDeskDepositLedgerUtils,
  );
});

test("app service module catalog loads before app startup and is cached", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const catalogScript = "features/app-service-module-catalog.js";

  assert.ok(
    html.indexOf("features/app-services.js") < html.indexOf(catalogScript),
  );
  assert.ok(html.indexOf(catalogScript) < html.indexOf("app.js?v="));
  assert.ok(worker.includes(`'./${catalogScript}'`));
});
