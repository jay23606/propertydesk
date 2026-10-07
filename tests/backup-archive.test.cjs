const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("backup archive assembles records and agreement files before ZIP encoding", async () => {
  const calls = [];
  const records = {
    pd_properties: [{ id: "property-1" }],
    pd_documents: [{ id: "agreement-1" }],
  };
  const agreementEntry = {
    name: "agreements/property-1/agreement-1.pdf",
    data: new Uint8Array([1, 2]),
  };
  const agreementEntries = [agreementEntry];
  const includedFiles = [
    {
      path: agreementEntries[0].name,
      file_name: "Agreement.pdf",
      file_size: 2,
    },
  ];
  const archived = { kind: "archive" };
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "backup-archive.js"),
      "utf8",
    ),
    context,
  );
  const archive = context.window.PropertyDeskBackupArchive.create({
    documentRepository: { kind: "document repository" },
    loadBackupRecords: async () => {
      calls.push(["load"]);
      return records;
    },
    collectBackupAgreementFiles: async (input) => {
      calls.push(["agreements", input]);
      return { entries: agreementEntries, includedFiles };
    },
    createBackup: (...args) => {
      calls.push(["manifest", ...args]);
      return { manifest: { file_count: args[2].length }, data: args[0] };
    },
    zipUtils: {
      createZip: (entries) => {
        calls.push(["zip", entries]);
        return archived;
      },
    },
    now: () => new Date("2026-10-06T13:00:00.000Z"),
  });
  const result = await archive.prepare({
    workspaceOwnerId: "owner-1",
  });

  assert.deepEqual(
    calls.map(([stage]) => stage),
    ["load", "agreements", "manifest", "zip"],
  );
  assert.equal(calls[1][1].documents, records.pd_documents);
  assert.equal(calls[1][1].repository.kind, "document repository");
  assert.equal(calls[1][1].workspaceOwnerId, "owner-1");
  assert.equal(calls[2][2], "2026-10-06T13:00:00.000Z");
  assert.equal(calls[2][3], includedFiles);
  const zipEntries = calls[3][1];
  assert.equal(zipEntries.length, 2);
  assert.equal(zipEntries[0].name, "propertydesk-backup.json");
  assert.deepEqual(JSON.parse(zipEntries[0].data).manifest, { file_count: 1 });
  assert.equal(zipEntries[1], agreementEntry);
  assert.deepEqual(
    { ...result },
    { blob: archived, recordCount: 2, agreementCount: 1 },
  );
});
