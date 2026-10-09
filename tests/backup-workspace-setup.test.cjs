const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("backup setup maps scoped data, private document access, and export modules", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "features", "backup-workspace-setup.js"),
    "utf8",
  );
  const context = vm.createContext({ window: {} });
  vm.runInContext(source, context);

  let received;
  const result = { attachBackupExportEvents() {} };
  const backup = {
    create(options) {
      received = options;
      return result;
    },
  };
  const records = {
    getUser: () => "user",
    getWorkspaceOwnerId: () => "owner",
    unusedRecordValue: true,
  };
  const ui = Object.fromEntries(
    ["$", "now", "todayIso", "toast"].map((key) => [key, () => key]),
  );
  const services = Object.fromEntries(
    [
      "isClientReady",
      "downloadBlob",
      "workspaceTables",
      "loadAllPages",
      "collectBackupAgreementFiles",
      "documentRepository",
    ].map((key) => [key, { key }]),
  );
  const workflows = {
    backup,
    zipUtils: { key: "zip" },
    utils: { key: "utils" },
    records: { key: "records" },
    exporter: { create: { key: "exporter" }, modules: { key: "modules" } },
  };

  assert.equal(
    context.window.PropertyDeskBackupWorkspaceSetup.create({
      records,
      ui,
      services,
      workflows,
    }),
    result,
  );
  assert.deepEqual(Object.keys(received).sort(), [
    "backupRecords",
    "exportOptions",
    "workflows",
  ]);
  assert.deepEqual(Object.keys(received.backupRecords).sort(), [
    "loadAllPages",
    "workspaceTables",
  ]);
  assert.deepEqual(Object.keys(received.exportOptions).sort(), [
    "$",
    "collectBackupAgreementFiles",
    "documentRepository",
    "downloadBlob",
    "getUser",
    "getWorkspaceOwnerId",
    "isClientReady",
    "now",
    "toast",
    "todayIso",
    "zipUtils",
  ]);
  assert.equal(
    Object.hasOwn(received.exportOptions, "unusedRecordValue"),
    false,
  );
  assert.equal(received.exportOptions.getUser, records.getUser);
  assert.equal(
    received.exportOptions.getWorkspaceOwnerId,
    records.getWorkspaceOwnerId,
  );
  assert.equal(received.exportOptions.$, ui.$);
  assert.equal(received.exportOptions.isClientReady, services.isClientReady);
  assert.equal(
    received.backupRecords.workspaceTables,
    services.workspaceTables,
  );
  assert.equal(received.backupRecords.loadAllPages, services.loadAllPages);
  assert.equal(
    received.exportOptions.collectBackupAgreementFiles,
    services.collectBackupAgreementFiles,
  );
  assert.equal(
    received.exportOptions.documentRepository,
    services.documentRepository,
  );
  assert.equal(received.exportOptions.zipUtils, workflows.zipUtils);
  assert.equal(received.workflows.exporter.create, workflows.exporter.create);
  assert.equal(received.workflows.exporter.modules, workflows.exporter.modules);
  assert.doesNotMatch(source, /\bstate\b/);
});
