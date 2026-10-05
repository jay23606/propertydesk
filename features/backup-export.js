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
        const includedFiles = [];
        const entries = [];
        const ownerPrefix = `${state.workspaceOwnerId}/`;

        for (const doc of records.pd_documents) {
          if (!doc.storage_path || !doc.storage_path.startsWith(ownerPrefix)) {
            throw new Error(
              "An agreement record has an invalid private storage path. No backup was downloaded.",
            );
          }
          const { data, error } = await state.client.storage
            .from("pd-private-agreements")
            .download(doc.storage_path);
          if (error || !data) {
            throw new Error(
              `Could not download agreement “${doc.file_name || "file"}”. ${error?.message || ""}`,
            );
          }
          const safeName =
            String(doc.file_name || "agreement")
              .normalize("NFKC")
              .replace(/[^\w.-]/g, "_")
              .slice(-100) || "agreement";
          const path = `agreements/${doc.property_id || "unassigned"}/${doc.id}-${safeName}`;
          const bytes = new Uint8Array(await data.arrayBuffer());
          entries.push({ name: path, data: bytes });
          includedFiles.push({
            path,
            file_name: doc.file_name,
            content_type: doc.content_type,
            file_size: bytes.byteLength,
            property_id: doc.property_id,
            account_id: doc.account_id,
          });
        }

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

  window.PropertyDeskBackupExport = { create };
})();
