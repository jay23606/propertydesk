/* PropertyDesk private JSON/ZIP backup workflow. */
(() => {
  "use strict";

  function create(context) {
    const {
      $,
      state,
      createBackup,
      todayIso,
      toast,
      downloadBlob = (blob, filename) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      },
      zipUtils = window.PropertyDeskZipUtils,
    } = context;

    async function exportAll() {
      if (!state.user || !state.client) {
        toast("Sign in before exporting your private records.");
        return;
      }
      const tables = [
        "pd_properties",
        "pd_accounts",
        "pd_agreement_versions",
        "pd_payments",
        "pd_expenses",
        "pd_deposit_entries",
        "pd_documents",
        "pd_import_batches",
        "pd_audit_events",
        "pd_workspace_members",
        "pd_property_holders",
      ];
      const button = $("export-all");
      const originalLabel = button.textContent;
      button.disabled = true;
      button.textContent = "Preparing backup…";
      toast("Preparing a private backup with agreement files…");

      try {
        const exportTable = async (table) => {
          const pageSize = 500;
          const rows = [];
          for (let offset = 0; ; offset += pageSize) {
            const { data, error } = await state.client
              .from(table)
              .select("*")
              .range(offset, offset + pageSize - 1);
            if (error) throw error;
            rows.push(...(data || []));
            if (!data || data.length < pageSize) break;
          }
          return rows;
        };
        const values = await Promise.all(tables.map(exportTable));
        const records = Object.fromEntries(
          tables.map((table, index) => [table, values[index]]),
        );
        const { entries, includedFiles } =
          await window.PropertyDeskBackupAgreementFiles.collect({
            documents: records.pd_documents,
            client: state.client,
            workspaceOwnerId: state.workspaceOwnerId,
          });

        const backup = createBackup(
          records,
          new Date().toISOString(),
          includedFiles,
        );
        entries.unshift({
          name: "propertydesk-backup.json",
          data: JSON.stringify(backup, null, 2),
        });
        const blob = zipUtils.createZip(entries);
        downloadBlob(blob, `propertydesk-backup-${todayIso()}.zip`);
        const recordCount = tables.reduce(
          (sum, table) => sum + records[table].length,
          0,
        );
        toast(
          `Private ZIP backup exported · ${recordCount} records · ${includedFiles.length} agreement files`,
        );
      } catch (error) {
        toast(
          `Backup failed; no file was downloaded. ${error.message || "Check your connection and try again."}`,
        );
      } finally {
        button.disabled = false;
        button.textContent = originalLabel;
      }
    }

    function attachEvents() {
      $("export-all").addEventListener("click", exportAll);
    }

    return { attachEvents };
  }

  window.PropertyDeskBackupExport = Object.freeze({ create });
})();
