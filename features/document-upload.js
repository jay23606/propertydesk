/* Upload private property agreements and reconcile storage metadata writes. */
(() => {
  "use strict";

  function create({
    getSelectedPropertyId,
    getWorkspaceOwnerId,
    getDocuments,
    toast,
    fetchAll,
    openPropertyDetails,
    makeId = () => crypto.randomUUID(),
    repository,
    describeUpload,
    refreshWorkspace,
    maintenanceModule,
  }) {
    const { uploadFile, saveDocumentMetadata } = maintenanceModule.create({
      getWorkspaceOwnerId,
      getDocuments,
      toast,
      fetchAll,
      openPropertyDetails,
      repository,
      refreshWorkspace,
    });

    async function reopenPropertyDetails(propertyId) {
      await refreshWorkspace({
        fetchAll,
        beforeRefresh: () => toast("Agreement uploaded privately"),
        afterRefresh: () => openPropertyDetails(propertyId),
        toast,
        refreshFailureMessage:
          "Agreement was uploaded, but the workspace could not refresh. Reload before uploading it again.",
      });
    }

    async function uploadPropertyDocument(input) {
      const file = input.files?.[0];
      const propertyId = getSelectedPropertyId();
      input.value = "";
      if (!file || !propertyId) return;

      const upload = describeUpload(file);
      if (!upload) {
        toast("Choose a PDF, DOCX, or JPEG agreement under 15 MB");
        return;
      }

      const { contentType, safeName } = upload;
      const path = `${getWorkspaceOwnerId()}/${propertyId}/${makeId()}-${safeName}`;
      if (!(await uploadFile(path, file, contentType))) return;
      const savedMetadata = await saveDocumentMetadata(
        propertyId,
        file,
        path,
        contentType,
      );
      if (!savedMetadata) return;
      if (savedMetadata === "reconciled") return;
      await reopenPropertyDetails(propertyId);
    }

    return Object.freeze({ uploadPropertyDocument });
  }

  window.PropertyDeskDocumentUpload = Object.freeze({ create });
})();
