/* Share CSV file staging and batch commits for payment and expense imports. */
(() => {
  "use strict";

  function create(context) {
    const {
      $,
      parseCSV,
      importReview,
      createFileWorkflow,
      inputId,
      emptyMessage,
      failurePrefix,
      title,
      validateRows,
      correctionKeys,
      mapRows,
      commitTransactions,
      kind,
      label,
    } = context;

    return createFileWorkflow({
      input: $(inputId),
      status: $("import-status"),
      parseCSV,
      emptyMessage,
      failurePrefix,
      handleRows(file, rows) {
        importReview.stage({
          title,
          rows,
          validateRows,
          correctionKeys,
          file,
          mapRows,
          commit({ rows: payload, file: sourceFile, total }) {
            return commitTransactions({
              kind,
              rows: payload,
              sourceName: sourceFile.name,
              total,
              label,
            });
          },
        });
      },
    });
  }

  window.PropertyDeskTransactionImportWorkflow = Object.freeze({ create });
})();
