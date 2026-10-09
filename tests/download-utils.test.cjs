const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("browser download helper clicks a temporary link and releases its URL", () => {
  const root = path.join(__dirname, "..");
  const source = fs.readFileSync(
    path.join(root, "features", "download-utils.js"),
    "utf8",
  );
  const browserAdapters = fs.readFileSync(
    path.join(root, "features", "app-browser-adapters.js"),
    "utf8",
  );
  assert.doesNotMatch(
    source,
    /documentRef = document|urlRef = URL|defer = setTimeout/,
  );
  assert.match(
    browserAdapters,
    /const schedule = windowRef\.setTimeout\.bind\(windowRef\);[\s\S]*?downloadBlob: \(blob, filename\) =>[\s\S]*?documentRef,[\s\S]*?urlRef: windowRef\.URL,[\s\S]*?defer: schedule,/,
  );
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "download-utils.js"),
      "utf8",
    ),
    context,
  );
  const blob = {};
  const urlCalls = [];
  const timerCalls = [];
  const link = {
    click() {
      this.clicked = true;
    },
  };

  context.window.PropertyDeskDownloadUtils.downloadBlob(blob, "records.zip", {
    documentRef: {
      createElement(tag) {
        assert.equal(tag, "a");
        return link;
      },
    },
    urlRef: {
      createObjectURL(receivedBlob) {
        assert.equal(receivedBlob, blob);
        return "blob:private-export";
      },
      revokeObjectURL(url) {
        urlCalls.push(url);
      },
    },
    defer(callback, delay) {
      timerCalls.push({ callback, delay });
    },
  });

  assert.equal(link.href, "blob:private-export");
  assert.equal(link.download, "records.zip");
  assert.equal(link.clicked, true);
  assert.equal(timerCalls[0].delay, 1000);
  timerCalls[0].callback();
  assert.deepEqual(urlCalls, ["blob:private-export"]);
});

test("shared download helper loads before both export features and is precached", () => {
  const root = path.join(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  for (const exporter of ["report-export.js", "backup-export.js"]) {
    assert.ok(
      html.indexOf("features/download-utils.js") <
        html.indexOf(`features/${exporter}`),
      `download helper should load before ${exporter}`,
    );
  }
  assert.match(worker, /'\.\/features\/download-utils\.js'/);
});
