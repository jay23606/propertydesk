const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("report setup wires read-only records and export services explicitly", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "features", "report-workspace-setup.js"),
    "utf8",
  );
  const context = vm.createContext({ window: {} });
  vm.runInContext(source, context);

  let received;
  const result = { renderReports() {}, attachReportExportEvents() {} };
  const reportWorkspace = {
    create(options) {
      received = options;
      return result;
    },
  };
  const recordKeys = [
    "getPayments",
    "getExpenses",
    "getAccounts",
    "getImportBatches",
    "getProperties",
  ];
  const uiKeys = [
    "$",
    "now",
    "dateOnly",
    "sumIncome",
    "sumOperatingExpenses",
    "accountBalance",
    "esc",
    "money",
    "fmtDateTime",
    "todayIso",
    "prettyType",
  ];
  const records = Object.fromEntries(recordKeys.map((key) => [key, () => key]));
  records.unusedRecordValue = true;
  const ui = Object.fromEntries(uiKeys.map((key) => [key, () => key]));
  ui.unusedUiValue = true;
  const services = { downloadBlob: { key: "download" } };
  services.unusedServiceValue = true;
  const workflows = Object.fromEntries(
    ["report", "exporter", "model", "views"].map((key) => [key, { key }]),
  );
  workflows.reportWorkspace = reportWorkspace;

  assert.equal(
    context.window.PropertyDeskReportWorkspaceSetup.create({
      records,
      ui,
      services,
      workflows,
    }),
    result,
  );
  assert.equal(received.rendering.getPayments, records.getPayments);
  assert.equal(received.rendering.getExpenses, records.getExpenses);
  assert.equal(received.rendering.getImportBatches, records.getImportBatches);
  assert.equal(received.exporting.getAccounts, records.getAccounts);
  assert.equal(received.exporting.getProperties, records.getProperties);
  assert.equal(received.exporting.downloadBlob, services.downloadBlob);
  assert.equal(received.workflows.report, workflows.report);
  assert.equal(received.workflows.exporter, workflows.exporter);
  assert.equal(received.workflows.model, workflows.model);
  assert.equal(received.workflows.views, workflows.views);
  assert.deepEqual(Object.keys(received.rendering).sort(), [
    "$",
    "accountBalance",
    "dateOnly",
    "esc",
    "fmtDateTime",
    "getAccounts",
    "getExpenses",
    "getImportBatches",
    "getPayments",
    "money",
    "now",
    "sumIncome",
    "sumOperatingExpenses",
  ]);
  assert.deepEqual(Object.keys(received.exporting).sort(), [
    "$",
    "accountBalance",
    "downloadBlob",
    "getAccounts",
    "getProperties",
    "prettyType",
    "todayIso",
  ]);
  assert.doesNotMatch(source, /\bstate\b/);
});
