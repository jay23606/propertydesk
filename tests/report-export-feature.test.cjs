const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("backup and report exports own separate button bindings", () => {
  for (const [file, globalName, expected] of [
    ["backup-export.js", "PropertyDeskBackupExport", ["export-all:click"]],
    ["report-export.js", "PropertyDeskReportExport", ["export-report:click"]],
  ]) {
    const context = vm.createContext({ window: {} });
    vm.runInContext(
      fs.readFileSync(
        path.join(__dirname, "..", "features", "download-utils.js"),
        "utf8",
      ),
      context,
    );
    if (file === "backup-export.js") {
      context.window.PropertyDeskWorkspaceTables = require("../workspace-table-catalog.js");
      context.window.PropertyDeskBackupUtils = require("../backup-utils.js");
      vm.runInContext(
        fs.readFileSync(
          path.join(__dirname, "..", "workspace-query.js"),
          "utf8",
        ),
        context,
      );
      for (const dependency of [
        "backup-records.js",
        "backup-agreement-files.js",
        "backup-archive.js",
      ]) {
        vm.runInContext(
          fs.readFileSync(
            path.join(__dirname, "..", "features", dependency),
            "utf8",
          ),
          context,
        );
      }
    }
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", file), "utf8"),
      context,
    );
    const bindings = new Map();
    const feature = context.window[globalName].create({
      $: (id) => ({
        addEventListener: (event, handler) =>
          bindings.set(`${id}:${event}`, handler),
      }),
    });

    feature.attachEvents();

    assert.deepEqual([...bindings.keys()], expected);
    assert.ok(
      [...bindings.values()].every((handler) => typeof handler === "function"),
    );
  }
});

test("app delegates Reports rendering and export composition to its workflow", () => {
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  assert.match(app, /PropertyDeskReportWorkflow\.create\(/);
  assert.doesNotMatch(
    app,
    /PropertyDeskReport(?:Model|Views|Export)\.create\(/,
  );
  assert.match(app, /renderers:[\s\S]*?renderReports/);
  assert.match(app, /eventBindersAfterAuth:[\s\S]*?attachReportExportEvents/);
});

test("Reports workflow composes calculation, view, and export modules", () => {
  const received = {};
  const renderReports = () => {};
  const attachReportExportEvents = () => {};
  const buildReportModel = () => {};
  const context = vm.createContext({
    window: {
      PropertyDeskReportModel: {
        create: (options) => {
          received.model = options;
          return { buildReportModel };
        },
      },
      PropertyDeskReportViews: {
        create: (options) => {
          received.view = options;
          return { renderReports };
        },
      },
      PropertyDeskReportExport: {
        create: (options) => {
          received.export = options;
          return { attachEvents: attachReportExportEvents };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "report-workflow.js"),
      "utf8",
    ),
    context,
  );
  const dependencies = {
    $() {},
    state: {},
    dateOnly() {},
    sumIncome() {},
    sumOperatingExpenses() {},
    accountBalance() {},
    esc() {},
    money() {},
    todayIso() {},
    prettyType() {},
  };
  const workflow =
    context.window.PropertyDeskReportWorkflow.create(dependencies);

  assert.equal(received.model.state, dependencies.state);
  assert.equal(received.model.dateOnly, dependencies.dateOnly);
  assert.equal(received.model.sumIncome, dependencies.sumIncome);
  assert.equal(
    received.model.sumOperatingExpenses,
    dependencies.sumOperatingExpenses,
  );
  assert.equal(received.model.accountBalance, dependencies.accountBalance);
  assert.equal(received.view.$, dependencies.$);
  assert.equal(received.view.esc, dependencies.esc);
  assert.equal(received.view.money, dependencies.money);
  assert.equal(received.view.buildReportModel, buildReportModel);
  assert.equal(received.export.state, dependencies.state);
  assert.equal(received.export.todayIso, dependencies.todayIso);
  assert.equal(received.export.prettyType, dependencies.prettyType);
  assert.equal(received.export.accountBalance, dependencies.accountBalance);
  assert.equal(workflow.renderReports, renderReports);
  assert.equal(workflow.attachReportExportEvents, attachReportExportEvents);
});

test("account CSV export keeps rental balances blank and escapes spreadsheet fields", async () => {
  const context = vm.createContext({ window: {}, Blob });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "download-utils.js"),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "report-export.js"),
      "utf8",
    ),
    context,
  );
  const downloads = [];
  let exportClick;
  const feature = context.window.PropertyDeskReportExport.create({
    $: (id) => {
      assert.equal(id, "export-report");
      return {
        addEventListener(eventName, handler) {
          assert.equal(eventName, "click");
          exportClick = handler;
        },
      };
    },
    state: {
      properties: [{ id: "property-1", name: "Main House, East" }],
      accounts: [
        {
          id: "rental-1",
          property_id: "property-1",
          name: "Lease",
          account_type: "rental",
          party_name: "Tenant",
          payment_amount: 825,
          next_due_date: "2026-11-01",
          status: "active",
        },
        {
          id: "note-1",
          property_id: "property-1",
          name: "Seller note",
          account_type: "note",
          party_name: "Buyer",
          payment_amount: 400,
          next_due_date: "2026-11-01",
          status: "active",
        },
      ],
    },
    todayIso: () => "2026-10-05",
    prettyType: (type) => type,
    accountBalance: (account) => (account.id === "note-1" ? 12000 : 0),
    downloadBlob: (blob, filename) => downloads.push({ blob, filename }),
  });

  assert.deepEqual(Object.keys(feature), ["attachEvents"]);
  feature.attachEvents();
  exportClick();

  assert.equal(downloads[0].filename, "propertydesk-accounts-2026-10-05.csv");
  assert.equal(
    await downloads[0].blob.text(),
    [
      "account_name,account_type,property,party,monthly_due,estimated_on_time_loan_balance,next_due_date,status",
      'Lease,rental,"Main House, East",Tenant,825,,2026-11-01,active',
      'Seller note,note,"Main House, East",Buyer,400,12000,2026-11-01,active',
    ].join("\r\n"),
  );
});
