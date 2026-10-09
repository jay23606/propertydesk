const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("app wires CSV import and private backup workspace workflow independently", () => {
  const root = path.join(__dirname, "..");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");

  assert.match(
    app,
    /PropertyDeskImportFeature\.create\(\{[\s\S]*?state,[\s\S]*?esc,[\s\S]*?openModal,[\s\S]*?closeModal,[\s\S]*?repository: repositories\.imports,[\s\S]*?writeFeedback,/,
  );
  const imports = fs.readFileSync(
    path.join(root, "features", "imports.js"),
    "utf8",
  );
  assert.match(imports, /preview\.create\(/);
  assert.match(imports, /modules: modules\.preview\.modules/);
  assert.match(imports, /previewEvents\.create\(/);
  assert.match(imports, /importRows;/);
  assert.match(imports, /validators;/);
  assert.doesNotMatch(imports, /window\.PropertyDesk(?!ImportFeature)/);
  assert.match(imports, /stageImport: importPreview\.stageImport/);
  assert.match(
    imports,
    /repository,\s*\n\s*writeFeedback,\s*\n\s*modules: modules\.commit\.modules,\s*\n\s*\}\);/,
  );
  assert.match(
    app,
    /modules:\s*\{[\s\S]*?importRows: window\.PropertyDeskImportRows,[\s\S]*?validators: window\.PropertyDeskImportWorkflows,[\s\S]*?transactionImportWorkflow: window\.PropertyDeskTransactionImportWorkflow,/,
  );
  assert.match(
    app,
    /preview: \{\s*create: window\.PropertyDeskImportPreview\.create,\s*modules: \{\s*correctionView: window\.PropertyDeskImportCorrectionView,\s*rendering: window\.PropertyDeskImportPreviewRendering,\s*table: window\.PropertyDeskImportPreviewTable,/,
  );
  assert.match(
    app,
    /commit: \{\s*create: window\.PropertyDeskImportCommit\.create,\s*modules: \{\s*batchReconciliation: window\.PropertyDeskImportBatchReconciliation,\s*reporting: window\.PropertyDeskImportCommitReporting,/,
  );
  assert.match(imports, /modules: modules\.commit\.modules/);
  assert.match(
    app,
    /PropertyDeskBackupWorkspaceWorkflow\.create\(\{[\s\S]*?workspaceTables: window\.PropertyDeskWorkspaceTables,[\s\S]*?loadAllPages: loadAllWorkspacePages,[\s\S]*?\}\);/,
  );
  assert.match(
    app,
    /attachImportPreviewEvents,\s*attachAccountImportEvents,\s*attachPaymentImportEvents,\s*attachExpenseImportEvents,/,
  );
  assert.match(app, /attachBackupExportEvents/);
  assert.doesNotMatch(app, /PropertyDeskDataTransferWorkflow/);

  for (const script of [
    "features/imports.js",
    "features/transaction-import-feature.js",
    "features/backup-export.js",
    "features/backup-workspace-workflow.js",
  ]) {
    assert.ok(
      html.indexOf(script) >= 0 &&
        html.indexOf(script) < html.indexOf("app.js"),
      `${script} loads before app.js`,
    );
    assert.match(worker, new RegExp(`'\\./${script.replaceAll("/", "\\/")}'`));
  }
  for (const script of [
    "features/import-preview.js",
    "features/import-preview-events.js",
  ]) {
    assert.ok(
      html.indexOf(script) < html.indexOf("app.js"),
      `${script} loads before app.js`,
    );
    assert.ok(worker.includes(`'./${script}'`));
  }
  assert.doesNotMatch(app, /PropertyDeskCsvImportWorkflow/);
  assert.doesNotMatch(html, /features\/csv-import-workflow\.js/);
  assert.doesNotMatch(worker, /features\/csv-import-workflow\.js/);
  assert.doesNotMatch(html, /data-transfer-workflow\.js/);
  assert.doesNotMatch(worker, /data-transfer-workflow\.js/);
});
