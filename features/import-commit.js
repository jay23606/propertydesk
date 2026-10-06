/* Refresh the workspace and report results after persisted import batches. */
(() => {
  "use strict";

  function createImportCommit({ state, fetchAll, status, toast }) {
    const repository = window.PropertyDeskImportRepository.create({
      getClient: () => state.client,
    });

    async function finish({ data, fallbackCount, total, label, toastMessage }) {
      await fetchAll();
      const imported = Number(data?.rows_accepted ?? fallbackCount);
      const rejected = total - imported;
      status.textContent = `Imported ${imported} ${label}${imported === 1 ? "" : "s"}; ${rejected} row${rejected === 1 ? " was" : "s were"} skipped or need correction. Source saved to import history.`;
      status.classList.add("success");
      toast(
        toastMessage ||
          `${label[0].toUpperCase()}${label.slice(1)} import complete`,
      );
    }

    async function commitAccounts({ rows, sourceName, total }) {
      const data = await repository.commitAccounts({ rows, sourceName, total });
      await finish({
        data,
        fallbackCount: rows.length,
        total,
        label: "account",
        toastMessage: "Import complete",
      });
    }

    async function commitTransactions({
      kind,
      rows,
      sourceName,
      total,
      label,
    }) {
      const data = await repository.commitTransactions({
        kind,
        rows,
        sourceName,
        total,
      });
      await finish({ data, fallbackCount: rows.length, total, label });
    }

    return { commitAccounts, commitTransactions };
  }

  window.PropertyDeskImportCommit = Object.freeze({
    create: createImportCommit,
  });
})();
