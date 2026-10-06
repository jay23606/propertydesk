/* Share transaction CSV review and commit coordination. */
(() => {
  "use strict";

  function createTransactionImportReview({ stageImport, commitTransactions }) {
    function stage({
      title,
      rows,
      validateRows,
      correctionKeys,
      file,
      kind,
      label,
      mapRows,
    }) {
      const validation = validateRows(rows);
      stageImport(
        title,
        validation.valid,
        async (rowsToImport, review) => {
          const payload = await mapRows(rowsToImport);
          await commitTransactions({
            kind,
            rows: payload,
            sourceName: file.name,
            total: review.total,
            label,
          });
        },
        "",
        {
          total: validation.total,
          errors: validation.errors,
          rawRows: rows,
          correctionKeys,
          revalidate: validateRows,
        },
      );
    }

    return { stage };
  }

  window.PropertyDeskTransactionImportReview = Object.freeze({
    create: createTransactionImportReview,
  });
})();
