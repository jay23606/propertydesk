/* PropertyDesk private JSON/ZIP backup workflow. */
(() => {
  "use strict";

  function create({
    $,
    getUser,
    getWorkspaceOwnerId,
    isClientReady,
    createBackup,
    now,
    todayIso,
    toast,
    downloadBlob,
    zipUtils,
    loadBackupRecords,
    collectBackupAgreementFiles,
    documentRepository,
    modules,
  }) {
    const archive = modules.archive.create({
      createBackup,
      zipUtils,
      loadBackupRecords,
      collectBackupAgreementFiles,
      documentRepository,
      now,
    });

    async function exportAll() {
      if (!getUser() || !isClientReady()) {
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
          workspaceOwnerId: getWorkspaceOwnerId(),
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

    function attachBackupExportEvents() {
      $("export-all").addEventListener("click", exportAll);
    }

    return Object.freeze({ attachBackupExportEvents });
  }

  window.PropertyDeskBackupExport = Object.freeze({ create });
})();
