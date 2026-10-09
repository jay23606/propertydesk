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
      context.window.PropertyDeskBackupUtils =
        require("../features/backup-utils.js").create({
          workspaceTables: require("../workspace-table-catalog.js"),
        });
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
      ...(file === "backup-export.js"
        ? { modules: { archive: context.window.PropertyDeskBackupArchive } }
        : {}),
    });

    (file === "backup-export.js"
      ? feature.attachBackupExportEvents
      : feature.attachEvents)();

    assert.deepEqual([...bindings.keys()], expected);
    assert.ok(
      [...bindings.values()].every((handler) => typeof handler === "function"),
    );
  }
});

test("app delegates Reports rendering and CSV export to one coordinator", () => {
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  assert.match(app, /PropertyDeskReportWorkspaceWorkflow\.create\(/);
  assert.doesNotMatch(app, /PropertyDeskReport(?:Workflow|Export)\.create\(/);
  assert.doesNotMatch(app, /PropertyDeskReport(?:Model|Views)\.create\(/);
  assert.match(app, /renderers:[\s\S]*?renderReports/);
  assert.match(app, /eventBindersAfterAuth:[\s\S]*?attachReportExportEvents/);
  const workspace = fs.readFileSync(
    path.join(__dirname, "..", "features", "report-workspace-workflow.js"),
    "utf8",
  );
  assert.match(
    workspace,
    /workflows\.report\.create\(\{[\s\S]*?money: rendering\.money,[\s\S]*?workflows\.exporter\.create\(\{[\s\S]*?downloadBlob: exporting\.downloadBlob,/,
  );
});

test("report workspace preserves rendering and export APIs", () => {
  const renderReports = () => {};
  const attachReportExportEvents = () => {};
  const rendering = {
    $() {},
    state: {},
    dateOnly() {},
    sumIncome() {},
    sumOperatingExpenses() {},
    accountBalance() {},
    esc() {},
    money() {},
    unusedRenderingValue: true,
  };
  const exporting = {
    $() {},
    state: {},
    todayIso() {},
    prettyType() {},
    accountBalance() {},
    downloadBlob() {},
    unusedExportingValue: true,
  };
  const passed = {};
  const workflows = {
    report: { create: null },
    exporter: { create: null },
    model: {},
    views: {},
  };
  const context = vm.createContext({
    window: {
      PropertyDeskReportWorkflow: {
        create(options) {
          passed.rendering = options;
          return { renderReports };
        },
      },
      PropertyDeskReportExport: {
        create(options) {
          passed.exporting = options;
          return { attachEvents: attachReportExportEvents };
        },
      },
    },
  });
  workflows.report = context.window.PropertyDeskReportWorkflow;
  workflows.exporter = context.window.PropertyDeskReportExport;
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "report-workspace-workflow.js"),
      "utf8",
    ),
    context,
  );

  const workspace = context.window.PropertyDeskReportWorkspaceWorkflow.create({
    rendering,
    exporting,
    workflows,
  });

  assert.deepEqual(Object.keys(passed.rendering).sort(), [
    "$",
    "accountBalance",
    "dateOnly",
    "esc",
    "money",
    "state",
    "sumIncome",
    "sumOperatingExpenses",
    "workflows",
  ]);
  assert.deepEqual(Object.keys(passed.exporting).sort(), [
    "$",
    "accountBalance",
    "downloadBlob",
    "prettyType",
    "state",
    "todayIso",
  ]);
  for (const key of Object.keys(passed.rendering)) {
    if (key === "workflows") continue;
    assert.equal(passed.rendering[key], rendering[key]);
  }
  assert.equal(passed.rendering.workflows.model, workflows.model);
  assert.equal(passed.rendering.workflows.views, workflows.views);
  for (const key of Object.keys(passed.exporting))
    assert.equal(passed.exporting[key], exporting[key]);
  assert.equal(workspace.renderReports, renderReports);
  assert.equal(workspace.attachReportExportEvents, attachReportExportEvents);
  assert.equal(Object.isFrozen(workspace), true);
});

test("Reports workflow composes calculation and view modules only", () => {
  const received = {};
  const renderReports = () => {};
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
    workflows: {
      model: context.window.PropertyDeskReportModel,
      views: context.window.PropertyDeskReportViews,
    },
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
  assert.equal(workflow.renderReports, renderReports);
  assert.deepEqual(Object.keys(workflow), ["renderReports"]);
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
