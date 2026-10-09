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
  const feedback = context.window.PropertyDeskRepositoryWriteFeedback;
  return {
    writeFeedback:
      typeof feedback?.create === "function"
        ? feedback.create({
            modules: {
              reconciliation:
                context.window.PropertyDeskWorkspaceWriteReconciliation,
              recordWrites:
                context.window.PropertyDeskWorkspaceRecordWriteWorkflow,
            },
          })
        : feedback || {},
    resolveVoidTarget:
      context.window.PropertyDeskTransactionVoidModel.resolveVoidTarget,
    buildVoidPayload:
      context.window.PropertyDeskTransactionVoidModel.buildVoidPayload,
  };
}

function transactionWriteFeedbackOptions(context) {
  const feedback = context.window.PropertyDeskRepositoryWriteFeedback;
  return {
    writeFeedback:
      typeof feedback?.create === "function"
        ? feedback.create({
            modules: {
              reconciliation:
                context.window.PropertyDeskWorkspaceWriteReconciliation,
              recordWrites:
                context.window.PropertyDeskWorkspaceRecordWriteWorkflow,
            },
          })
        : feedback || {},
  };
}

module.exports = {
  loadTransactionRepository,
  transactionVoidModelOptions,
  transactionWriteFeedbackOptions,
};
