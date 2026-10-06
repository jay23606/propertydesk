/* Persist approved account, payment, and expense import batches. */
(() => {
  "use strict";

  function createImportCommit({ state, fetchAll, status, toast }) {
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
      const { data, error } = await state.client.rpc(
        "pd_import_propertydesk_accounts",
        {
          p_rows: rows,
          p_source_name: sourceName,
          p_rows_total: total,
        },
      );
      if (error) throw error;
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
      const { data, error } = await state.client.rpc(
        "pd_import_propertydesk_transactions",
        {
          p_kind: kind,
          p_rows: rows,
          p_source_name: sourceName,
          p_rows_total: total,
        },
      );
      if (error) throw error;
      await finish({ data, fallbackCount: rows.length, total, label });
    }

    return { commitAccounts, commitTransactions };
  }

  window.PropertyDeskImportCommit = Object.freeze({
    create: createImportCommit,
  });
})();
