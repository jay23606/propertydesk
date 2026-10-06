const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("app wires CSV import and private backup export independently", () => {
  const root = path.join(__dirname, "..");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");

  assert.match(
    app,
    /PropertyDeskCsvImportWorkflow\.create\(\{[\s\S]*?fetchAll,[\s\S]*?\}\);/,
  );
  assert.match(
    app,
    /PropertyDeskBackupExport\.create\(\{[\s\S]*?createBackup,[\s\S]*?toast,[\s\S]*?\}\);/,
  );
  assert.match(app, /attachEvents: attachCsvImportEvents/);
  assert.match(app, /attachEvents: attachExportEvents/);
  assert.doesNotMatch(app, /PropertyDeskDataTransferWorkflow/);

  for (const script of [
    "features/csv-import-workflow.js",
    "features/backup-export.js",
  ]) {
    assert.ok(
      html.indexOf(script) >= 0 &&
        html.indexOf(script) < html.indexOf("app.js"),
      `${script} loads before app.js`,
    );
    assert.match(worker, new RegExp(`'\\./${script.replaceAll("/", "\\/")}'`));
  }
  assert.doesNotMatch(html, /data-transfer-workflow\.js/);
  assert.doesNotMatch(worker, /data-transfer-workflow\.js/);
});
