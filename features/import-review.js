/* Share validated CSV preview staging and commit coordination. */
(() => {
  "use strict";

  function createImportReview({ stageImport }) {
    function stage({
      title,
      rows,
      validateRows,
      correctionKeys,
      file,
      mapRows,
      commit,
    }) {
      const validation = validateRows(rows);
      stageImport(
        title,
        validation.valid,
        async (rowsToImport, review) => {
          const payload = await mapRows(rowsToImport);
          await commit({ rows: payload, file, total: review.total });
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

  window.PropertyDeskImportReview = Object.freeze({
    create: createImportReview,
  });
})();
