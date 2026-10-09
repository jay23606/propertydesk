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
  assert.equal(received.getUser, records.getUser);
  assert.equal(received.getWorkspaceOwnerId, records.getWorkspaceOwnerId);
  assert.equal(received.$, ui.$);
  assert.equal(received.isClientReady, services.isClientReady);
  assert.equal(received.workspaceTables, services.workspaceTables);
  assert.equal(received.loadAllPages, services.loadAllPages);
  assert.equal(
    received.collectBackupAgreementFiles,
    services.collectBackupAgreementFiles,
  );
  assert.equal(received.documentRepository, services.documentRepository);
  assert.equal(received.zipUtils, workflows.zipUtils);
  assert.equal(received.workflows.exporter.create, workflows.exporter.create);
  assert.equal(received.workflows.exporter.modules, workflows.exporter.modules);
  assert.doesNotMatch(source, /\bstate\b/);
});
