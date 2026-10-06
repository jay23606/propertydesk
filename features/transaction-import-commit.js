/* Persist staged payment and expense rows through the shared import RPC. */
(() => {
  "use strict";

  function createTransactionImportCommit({ state, fetchAll, status, toast }) {
    async function commit({ kind, rows, sourceName, total, label }) {
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
      await fetchAll();

      const imported = Number(data?.rows_accepted ?? rows.length);
      const rejected = total - imported;
      status.textContent = `Imported ${imported} ${label}${imported === 1 ? "" : "s"}; ${rejected} row${rejected === 1 ? " was" : "s were"} skipped or need correction. Source saved to import history.`;
      status.classList.add("success");
      toast(`${label[0].toUpperCase()}${label.slice(1)} import complete`);
    }

    return { commit };
  }

  window.PropertyDeskTransactionImportCommit = Object.freeze({
    create: createTransactionImportCommit,
  });
})();
