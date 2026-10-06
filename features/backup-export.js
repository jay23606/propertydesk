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
      downloadBlob = window.PropertyDeskDownloadUtils.downloadBlob,
      zipUtils = window.PropertyDeskZipUtils,
      loadBackupRecords = window.PropertyDeskBackupRecords.load,
      collectBackupAgreementFiles = window.PropertyDeskBackupAgreementFiles
        .collect,
    } = context;

    async function exportAll() {
      if (!state.user || !state.client) {
        toast("Sign in before exporting your private records.");
        return;
      }
      const button = $("export-all");
      const originalLabel = button.textContent;
      button.disabled = true;
      button.textContent = "Preparing backup…";
      toast("Preparing a private backup with agreement files…");

      try {
        const records = await loadBackupRecords(state.client);
        const { entries, includedFiles } = await collectBackupAgreementFiles({
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
        const recordCount = Object.values(records).reduce(
          (sum, tableRows) => sum + tableRows.length,
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
