const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("document repository centralizes private storage and workspace-scoped metadata", async () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "document-repository.js"),
      "utf8",
    ),
    context,
  );
  const calls = [];
  const client = {
    storage: {
      from(bucket) {
        calls.push(["bucket", bucket]);
        return {
          upload: async (...args) => {
            calls.push(["upload", ...args]);
            return { error: null };
          },
          remove: async (...args) => {
            calls.push(["remove", ...args]);
            return { error: null };
          },
          download: async (...args) => {
            calls.push(["download", ...args]);
            return { data: "file", error: null };
          },
          createSignedUrl: async (...args) => {
            calls.push(["sign", ...args]);
            return { data: { signedUrl: "https://signed.test" }, error: null };
          },
        };
      },
    },
    from(table) {
      calls.push(["table", table]);
      const query = {
        insert: async (record) => {
          calls.push(["insert", record]);
          return { error: null };
        },
        delete: () => query,
        eq: (column, value) => {
          calls.push(["filter", column, value]);
          return query;
        },
      };
      return query;
    },
  };
  const repository =
    context.window.PropertyDeskDocumentRepository.create(client);

  await repository.upload(
    "owner/property/file.pdf",
    { name: "file.pdf" },
    "application/pdf",
  );
  await repository.insertMetadata({
    user_id: "owner",
    property_id: "property",
  });
  await repository.remove("owner/property/file.pdf");
  await repository.download("owner/property/file.pdf");
  await repository.deleteMetadata("document", "owner", "property");
  const signed = await repository.signedUrl("owner/property/file.pdf", 60);

  assert.equal(signed.data.signedUrl, "https://signed.test");
  assert.ok(
    calls.some(
      (call) => call[0] === "bucket" && call[1] === "pd-private-agreements",
    ),
  );
  assert.ok(
    calls.some((call) => call[0] === "upload" && call[3].upsert === false),
  );
  assert.ok(
    calls.some((call) => call[0] === "table" && call[1] === "pd_documents"),
  );
  assert.deepEqual(
    calls.filter((call) => call[0] === "filter"),
    [
      ["filter", "id", "document"],
      ["filter", "user_id", "owner"],
      ["filter", "property_id", "property"],
    ],
  );
  assert.ok(calls.some((call) => call[0] === "sign" && call[2] === 60));
  assert.ok(
    calls.some(
      (call) => call[0] === "download" && call[1] === "owner/property/file.pdf",
    ),
  );
});

test("document repository resolves the client lazily after workspace sign-in", async () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "document-repository.js"),
      "utf8",
    ),
    context,
  );
  let client = null;
  const repository = context.window.PropertyDeskDocumentRepository.create(
    () => client,
  );

  assert.throws(
    () => repository.upload("owner/property/file.pdf", {}, "application/pdf"),
    /unavailable until sign-in/,
  );
  const calls = [];
  client = {
    storage: {
      from(bucket) {
        calls.push(bucket);
        return { upload: async () => ({ error: null }) };
      },
    },
  };

  await repository.upload("owner/property/file.pdf", {}, "application/pdf");
  assert.deepEqual(calls, ["pd-private-agreements"]);
});
