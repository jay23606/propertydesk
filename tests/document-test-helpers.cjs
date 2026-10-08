const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadDocumentModules(context) {
  for (const filename of [
    "workspace-write-reconciliation.js",
    "workspace-record-write-workflow.js",
    "repository-write-feedback.js",
    "document-repository.js",
    "document-upload-maintenance.js",
    "document-upload-policy.js",
    "document-upload.js",
    "document-delete-maintenance.js",
    "document-delete.js",
    "document-open.js",
    "document-actions.js",
    "documents.js",
  ]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
      context,
    );
  }
}

function createDocuments(context, options) {
  return context.window.PropertyDeskDocuments.create({
    ...options,
    repository:
      options.repository ||
      context.window.PropertyDeskDocumentRepository.create({
        getClient: () => options.state.client,
      }),
  });
}

module.exports = { loadDocumentModules, createDocuments };
