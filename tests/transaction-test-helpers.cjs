const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadTransactionRepository(context) {
  for (const filename of [
    "repository-query-utils.js",
    "workspace-write-reconciliation.js",
    "workspace-record-write-workflow.js",
    "repository-write-feedback.js",
    "transaction-repository.js",
  ]) {
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
      context,
    );
  }
}

function transactionVoidModelOptions(context) {
  if (!context.window.PropertyDeskTransactionVoidModel) {
    vm.runInContext(
      fs.readFileSync(
        path.join(__dirname, "..", "features", "transaction-void-model.js"),
        "utf8",
      ),
      context,
    );
  }
  return {
    writeFeedback: context.window.PropertyDeskRepositoryWriteFeedback,
    resolveVoidTarget:
      context.window.PropertyDeskTransactionVoidModel.resolveVoidTarget,
    buildVoidPayload:
      context.window.PropertyDeskTransactionVoidModel.buildVoidPayload,
  };
}

function transactionWriteFeedbackOptions(context) {
  return {
    writeFeedback: context.window.PropertyDeskRepositoryWriteFeedback,
  };
}

module.exports = {
  loadTransactionRepository,
  transactionVoidModelOptions,
  transactionWriteFeedbackOptions,
};
