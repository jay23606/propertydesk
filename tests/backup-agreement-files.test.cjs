const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("backup agreement collector downloads only workspace-scoped files into the archive manifest", async () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "document-repository.js"),
      "utf8",
    ),
    context,
  );
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "backup-agreement-files.js"),
      "utf8",
    ),
    context,
  );
  const fileBytes = new Uint8Array([1, 2, 3]);
  const storagePath = "workspace-1/property-1/doc-1-agreement.pdf";
  const collected =
    await context.window.PropertyDeskBackupAgreementFiles.collect({
      documents: [
        {
          id: "doc-1",
          user_id: "workspace-1",
          property_id: "property-1",
          account_id: null,
          storage_path: storagePath,
          file_name: "Signed # agreement.pdf",
          content_type: "application/pdf",
        },
      ],
      workspaceOwnerId: "workspace-1",
      repository: context.window.PropertyDeskDocumentRepository.create({
        getClient: () => ({
          storage: {
            from(bucket) {
              assert.equal(bucket, "pd-private-agreements");
              return {
                async download(path) {
                  assert.equal(path, storagePath);
                  return {
                    data: {
                      async arrayBuffer() {
                        return fileBytes.buffer;
                      },
                    },
                    error: null,
                  };
                },
              };
            },
          },
        }),
      }),
    });

  assert.equal(
    collected.entries[0].name,
    "agreements/property-1/doc-1-Signed___agreement.pdf",
  );
  assert.deepEqual(Array.from(collected.entries[0].data), [1, 2, 3]);
  assert.equal(collected.includedFiles[0].file_size, 3);
  assert.equal(collected.includedFiles[0].content_type, "application/pdf");
  assert.equal(collected.includedFiles[0].property_id, "property-1");
});
