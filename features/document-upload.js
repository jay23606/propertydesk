/* Upload private property agreements and reconcile storage metadata writes. */
(() => {
  "use strict";

  function create({
    state,
    toast,
    fetchAll,
    openPropertyDetails,
    makeId = () => crypto.randomUUID(),
    repository,
    describeUpload,
  }) {
    const { uploadFile, saveDocumentMetadata } =
      window.PropertyDeskDocumentUploadMaintenance.create({
        state,
        toast,
        fetchAll,
        openPropertyDetails,
        repository,
      });

    async function reopenPropertyDetails(propertyId) {
      await window.PropertyDeskRepositoryWriteFeedback.refreshWorkspace({
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
      const propertyId = state.selectedPropertyId;
      input.value = "";
      if (!file || !propertyId) return;

      const upload = describeUpload(file);
      if (!upload) {
        toast("Choose a PDF, DOCX, or JPEG agreement under 15 MB");
        return;
      }

      const { contentType, safeName } = upload;
      const path = `${state.workspaceOwnerId}/${propertyId}/${makeId()}-${safeName}`;
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
