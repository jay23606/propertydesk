/* PropertyDesk private JSON/ZIP backup workflow. */
(() => {
  "use strict";

  function create(context) {
    const {
      $,
      state,
      isClientReady,
      createBackup,
      todayIso,
      toast,
      downloadBlob,
      zipUtils,
      loadBackupRecords,
      collectBackupAgreementFiles,
      documentRepository,
    } = context;
    const archive = window.PropertyDeskBackupArchive.create({
      createBackup,
      zipUtils,
      loadBackupRecords,
      collectBackupAgreementFiles,
      documentRepository,
    });

    async function exportAll() {
      if (!state.user || !isClientReady()) {
        toast("Sign in before exporting your private records.");
        return;
      }
      const button = $("export-all");
      const originalLabel = button.textContent;
      button.disabled = true;
      button.textContent = "Preparing backup…";
      toast("Preparing a private backup with agreement files…");

      try {
        const { blob, recordCount, agreementCount } = await archive.prepare({
          workspaceOwnerId: state.workspaceOwnerId,
        });
        downloadBlob(blob, `propertydesk-backup-${todayIso()}.zip`);
        toast(
          `Private ZIP backup exported · ${recordCount} records · ${agreementCount} agreement files`,
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
