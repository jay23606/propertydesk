const test = require("node:test");
const assert = require("node:assert/strict");
require("../workspace-table-catalog.js");
require("../features/date-utils.js");
require("../ledger-schedule-utils.js");
require("../loan-amortization-utils.js");
const { createBackup } = require("../backup-utils.js");
const ledgerUtils = require("../ledger-utils.js");

test("backup manifest generation stays separate from ledger calculations", () => {
  assert.equal(typeof createBackup, "function");
  assert.equal(Object.hasOwn(ledgerUtils, "createBackup"), false);
});

test("backup manifest identifies its version and counts every supported table", () => {
  const backup = createBackup(
    {
      pd_properties: [{ id: "p1" }],
      pd_accounts: [{ id: "a1" }, { id: "a2" }],
      pd_agreement_versions: [{ id: "v1" }],
      pd_payments: [],
      pd_expenses: [{ id: "e1" }],
      pd_documents: [{ id: "d1" }],
      pd_import_batches: [{ id: "b1" }],
      pd_audit_events: [{ id: "h1" }, { id: "h2" }],
      pd_workspace_members: [{ member_user_id: "u1" }],
      pd_property_holders: [{ property_id: "p1", member_user_id: "u1" }],
      pd_reminder_logs: [{ id: "r1" }],
    },
    "2026-10-03T12:00:00.000Z",
    [
      {
        path: "agreements/p1/d1-lease.pdf",
        file_name: "lease.pdf",
        content_type: "application/pdf",
        file_size: 42,
        property_id: "p1",
        account_id: "a1",
      },
    ],
  );
  assert.equal(backup.manifest.format, "propertydesk-backup");
  assert.equal(backup.manifest.format_version, 7);
  assert.equal(backup.manifest.schema_version, 7);
  assert.equal(backup.manifest.exported_at, "2026-10-03T12:00:00.000Z");
  assert.equal(backup.manifest.restore_supported, false);
  assert.equal(backup.manifest.file_count, 1);
  assert.deepEqual(backup.manifest.included_files[0], {
    path: "agreements/p1/d1-lease.pdf",
    file_name: "lease.pdf",
    content_type: "application/pdf",
    file_size: 42,
    property_id: "p1",
    account_id: "a1",
  });
  assert.deepEqual(backup.manifest.record_counts, {
    pd_properties: 1,
    pd_accounts: 2,
    pd_agreement_versions: 1,
    pd_payments: 0,
    pd_expenses: 1,
    pd_deposit_entries: 0,
    pd_documents: 1,
    pd_import_batches: 1,
    pd_audit_events: 2,
    pd_workspace_members: 1,
    pd_property_holders: 1,
    pd_reminder_logs: 1,
  });
  assert.equal(backup.data.pd_audit_events.length, 2);
});

test("private ZIP helper writes readable stored entries and rejects unsafe paths", async () => {
  const { createZip, crc32 } = require("../zip-utils.js");
  assert.equal(crc32(Buffer.from("123456789")), 0xcbf43926);
  const bytes = new Uint8Array(
    await createZip(
      [
        { name: "propertydesk-backup.json", data: '{"ok":true}' },
        {
          name: "agreements/property-1/lease.pdf",
          data: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
        },
      ],
      new Date("2026-10-03T12:00:00Z"),
    ).arrayBuffer(),
  );
  const view = new DataView(bytes.buffer);
  assert.equal(view.getUint32(0, true), 0x04034b50);
  assert.equal(
    view.getUint16(8, true),
    0,
    "entries are stored without a compression dependency",
  );
  assert.ok(
    bytes.some(
      (_, index) =>
        index <= bytes.length - 4 && view.getUint32(index, true) === 0x06054b50,
    ),
    "archive has a central-directory end record",
  );
  assert.throws(
    () => createZip([{ name: "../private.txt", data: "nope" }]),
    /relative paths/,
  );
});
