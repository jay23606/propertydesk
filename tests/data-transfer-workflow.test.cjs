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
    "PropertyDeskImportPreview.create(",
    "PropertyDeskImportPreviewEvents.create(",
    "PropertyDeskImportFeature.create(",
  ].map((marker) => app.indexOf(marker));
  assert.ok(importOrder.every((position) => position >= 0));
  assert.deepEqual(
    importOrder,
    [...importOrder].sort((left, right) => left - right),
  );
  assert.match(app, /stageImport,/);
  assert.match(
    app,
    /renderImportPreview: importPreview\.renderImportPreview,[\s\S]*?updateImportCommitButton: importPreview\.updateImportCommitButton,/,
  );
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
