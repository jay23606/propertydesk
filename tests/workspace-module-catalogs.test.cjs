const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "..");

function loadCatalog(filename, exportName) {
  const source = fs.readFileSync(path.join(root, "features", filename), "utf8");
  const moduleNames = [
    ...new Set(
      [...source.matchAll(/window\.(PropertyDesk[A-Za-z]+)/g)]
        .map((match) => match[1])
        .filter((name) => name !== exportName),
    ),
  ];
  const window = Object.fromEntries(
    moduleNames.map((name) => [
      name,
      name === "PropertyDeskLedgerEntryForms" ||
      name === "PropertyDeskTransactionViews"
        ? { create() {} }
        : Object.freeze({ name }),
    ]),
  );
  const context = vm.createContext({ window });
  vm.runInContext(source, context);
  return { catalog: window[exportName].create(), window };
}

test("transaction workspace module catalog owns its workflow dependencies", () => {
  const { catalog, window } = loadCatalog(
    "transaction-workspace-module-catalog.js",
    "PropertyDeskTransactionWorkspaceModuleCatalog",
  );

  assert.equal(Object.isFrozen(catalog), true);
  assert.deepEqual(Object.keys(catalog).sort(), [
    "correction",
    "correctionModel",
    "correctionModules",
    "entryForms",
    "expenseAccountPolicy",
    "expenseView",
    "ledger",
    "maintenance",
    "maintenanceEvents",
    "paymentView",
    "propertyPaymentAction",
    "transactionPayloads",
    "views",
    "voidEntry",
    "voidMaintenance",
    "voidModel",
    "workspace",
  ]);
  assert.equal(
    catalog.correctionModules.maintenance,
    window.PropertyDeskTransactionCorrectionMaintenance,
  );
  assert.equal(
    catalog.entryForms.create,
    window.PropertyDeskLedgerEntryForms.create,
  );
  assert.equal(
    catalog.views.modules.rowView,
    window.PropertyDeskTransactionRowView,
  );
  assert.equal(
    catalog.maintenanceEvents,
    window.PropertyDeskTransactionMaintenanceEvents,
  );
});

test("account and deposit module catalog keeps detail and adjustment workflows together", () => {
  const { catalog, window } = loadCatalog(
    "account-deposit-workspace-module-catalog.js",
    "PropertyDeskAccountDepositWorkspaceModuleCatalog",
  );

  assert.equal(Object.isFrozen(catalog), true);
  assert.deepEqual(Object.keys(catalog).sort(), [
    "accountDetails",
    "adjustmentModel",
    "deposit",
    "workspace",
  ]);
  assert.equal(
    catalog.deposit.adjustmentModules.maintenance,
    window.PropertyDeskDepositMaintenance,
  );
  assert.equal(
    catalog.accountDetails.actionWorkflows.closeEntry,
    window.PropertyDeskAccountCloseEntry,
  );
  assert.equal(
    catalog.accountDetails.contentModules.accountHistoryModel,
    window.PropertyDeskAccountHistoryModel,
  );
});

test("property workspace module catalog owns overview, detail, and portfolio dependencies", () => {
  const { catalog, window } = loadCatalog(
    "property-workspace-module-catalog.js",
    "PropertyDeskPropertyWorkspaceModuleCatalog",
  );

  assert.equal(Object.isFrozen(catalog), true);
  assert.equal(
    catalog.contentModules.activityModules.transactions,
    window.PropertyDeskPropertyActivityTransactions,
  );
  assert.equal(
    catalog.managementModules.detailEvents,
    window.PropertyDeskPropertyDetailEvents,
  );
  assert.equal(
    catalog.portfolioModules.pdfExport,
    window.PropertyDeskPropertyPdfExport,
  );
  assert.equal(
    catalog.documentModules.actions.modules.open,
    window.PropertyDeskDocumentOpen,
  );
  assert.equal(
    catalog.quickNote.noteMaintenance,
    window.PropertyDeskPropertyNoteMaintenance,
  );
});

test("workspace module catalogs load before the root and stay in the PWA shell", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const catalogs = [
    "features/transaction-workspace-module-catalog.js",
    "features/account-deposit-workspace-module-catalog.js",
    "features/property-workspace-module-catalog.js",
  ];

  for (const catalog of catalogs) {
    assert.ok(html.indexOf(catalog) < html.indexOf("app.js?v="));
    assert.ok(worker.includes(`'./${catalog}'`));
  }
  assert.match(
    app,
    /workflows: window\.PropertyDeskTransactionWorkspaceModuleCatalog\.create\(\)/,
  );
  assert.match(
    app,
    /workflows:\s*window\.PropertyDeskAccountDepositWorkspaceModuleCatalog\.create\(\)/,
  );
  assert.match(
    app,
    /workflows:\s*window\.PropertyDeskPropertyWorkspaceModuleCatalog\.create\(\)/,
  );
});
