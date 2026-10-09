const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "..");

function createFeature(overrides = {}) {
  const output = { written: "", printed: 0, toast: [] };
  const reportWindow = {
    document: {
      open() {},
      write(html) {
        output.written = html;
      },
      close() {},
    },
    print() {
      output.printed++;
    },
  };
  let click;
  const button = {
    addEventListener(eventName, listener) {
      assert.equal(eventName, "click");
      click = listener;
    },
  };
  const rows = [
    {
      hasAccount: true,
      property: { notes: "Call <before noon>" },
      accountRecord: {
        party_email: "tenant@example.com",
        party_phone: "555-0102",
        name: "Rental",
      },
      partyName: "Renter & Buyer",
      scheduledPayment: 825,
      unpaidDue: 125,
      loanBalance: null,
      paymentStatus: "partial",
    },
    { hasAccount: false, property: { notes: "No account" } },
  ];
  const window = {
    setTimeout(callback) {
      callback();
    },
  };
  const context = vm.createContext({
    window,
    Date,
  });
  vm.runInContext(
    fs.readFileSync(path.join(root, "features/property-pdf-export.js"), "utf8"),
    context,
  );
  const feature = context.window.PropertyDeskPropertyPdfExport.create({
    $: () => button,
    getRows: () => rows,
    propertyAddress: () => "10 Main St, Altoona, PA 16601",
    esc(value) {
      return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
    },
    money(value) {
      return `$${Number(value).toFixed(2)}`;
    },
    toast(message) {
      output.toast.push(message);
    },
    openWindow: () =>
      overrides.openWindow ? overrides.openWindow(reportWindow) : reportWindow,
    now: () => new Date("2026-10-09T12:00:00Z"),
  });
  return { feature, output, click: () => click() };
}

test("Properties PDF report includes useful details, escapes PII, and prints landscape", () => {
  const { feature } = createFeature();
  const html = feature.reportHTML([
    {
      hasAccount: true,
      property: { notes: "Call <before noon>" },
      accountRecord: {
        party_email: "tenant@example.com",
        party_phone: "555-0102",
        name: "Rental",
      },
      partyName: "Renter & Buyer",
      scheduledPayment: 825,
      unpaidDue: 125,
      loanBalance: null,
      paymentStatus: "partial",
    },
    { hasAccount: false, property: { notes: "Vacant property note" } },
  ]);

  assert.match(html, /@page \{ size: letter landscape/);
  assert.match(html, /10 Main St, Altoona, PA 16601/);
  assert.match(html, /tenant@example\.com/);
  assert.match(html, /555-0102/);
  assert.match(html, /\$825\.00/);
  assert.match(html, /\$125\.00/);
  assert.match(html, /Call &lt;before noon&gt;/);
  assert.match(html, /No account/);
  assert.match(html, /Vacant property note/);
  assert.match(html, /Paid in full this month|Partial payment this month/);
});

test("Properties PDF button opens the local printable report and calls print", () => {
  const { feature, output, click } = createFeature();
  feature.attachEvents();
  click();

  assert.match(output.written, /PropertyDesk · Properties/);
  assert.match(output.written, /tenant@example.com/);
  assert.equal(output.printed, 1);
  assert.deepEqual(output.toast, []);
});

test("Properties PDF export reports when the print window is blocked", () => {
  const { feature, output } = createFeature({ openWindow: () => null });
  feature.exportPDF();
  assert.equal(output.written, "");
  assert.deepEqual(output.toast, [
    "Allow pop-ups to print or save the Properties PDF.",
  ]);
});
