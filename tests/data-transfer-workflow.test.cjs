const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("app wires CSV import and private backup export independently", () => {
  const root = path.join(__dirname, "..");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");

  const importOrder = [
    "PropertyDeskImportPreviewWorkflow.create(",
    "PropertyDeskImportFeature.create(",
  ].map((marker) => app.indexOf(marker));
  assert.ok(importOrder.every((position) => position >= 0));
  assert.deepEqual(
    importOrder,
    [...importOrder].sort((left, right) => left - right),
  );
  assert.match(app, /stageImport,/);
  assert.doesNotMatch(app, /PropertyDeskImportPreview\.create\(/);
  assert.doesNotMatch(app, /PropertyDeskImportPreviewEvents\.create\(/);
  assert.match(
    app,
    /PropertyDeskBackupExport\.create\(\{[\s\S]*?createBackup,[\s\S]*?toast,[\s\S]*?\}\);/,
  );
  assert.match(
    app,
    /attachImportPreviewEvents,\s*attachAccountImportEvents,\s*attachPaymentImportEvents,\s*attachExpenseImportEvents,/,
  );
  assert.match(app, /attachEvents: attachExportEvents/);
  assert.doesNotMatch(app, /PropertyDeskDataTransferWorkflow/);

  for (const script of ["features/imports.js", "features/backup-export.js"]) {
    assert.ok(
      html.indexOf(script) >= 0 &&
        html.indexOf(script) < html.indexOf("app.js"),
      `${script} loads before app.js`,
    );
    assert.match(worker, new RegExp(`'\\./${script.replaceAll("/", "\\/")}'`));
  }
  assert.ok(
    html.indexOf("features/import-preview-events.js") <
      html.indexOf("features/import-preview-workflow.js") &&
      html.indexOf("features/import-preview-workflow.js") <
        html.indexOf("app.js"),
  );
  assert.match(worker, /'\.\/features\/import-preview-workflow\.js'/);
  assert.doesNotMatch(app, /PropertyDeskCsvImportWorkflow/);
  assert.doesNotMatch(html, /features\/csv-import-workflow\.js/);
  assert.doesNotMatch(worker, /features\/csv-import-workflow\.js/);
  assert.doesNotMatch(html, /data-transfer-workflow\.js/);
  assert.doesNotMatch(worker, /data-transfer-workflow\.js/);
});
