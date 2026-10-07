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
    async function uploadFile(path, file, contentType) {
      let error;
      try {
        ({ error } = await repository.upload(path, file, contentType));
      } catch (requestError) {
        toast(
          `Agreement upload failed: ${requestError.message || "Check your connection and try again."}`,
        );
        return false;
      }
      if (error) {
        toast(`Agreement upload failed: ${error.message}`);
        return false;
      }
      return true;
    }

    async function saveDocumentMetadata(propertyId, file, path, contentType) {
      let error;
      try {
        ({ error } = await repository.insertMetadata({
          user_id: state.workspaceOwnerId,
          property_id: propertyId,
          account_id: null,
          file_name: file.name,
          storage_path: path,
          content_type: file.type || contentType,
          file_size: file.size,
        }));
      } catch (requestError) {
        toast(
          `Agreement record status couldn't be confirmed. Reload the property details before retrying; the private file was kept to avoid breaking a saved record. ${requestError.message || "Check your connection and try again."}`,
        );
        return false;
      }
      if (error) {
        const cleaned = await removeUploadedFile(path);
        toast(
          `Agreement record failed${cleaned ? "; uploaded file removed" : "; uploaded file may need cleanup"}. ${error.message}`,
        );
        return false;
      }
      return true;
    }

    async function reopenPropertyDetails(propertyId) {
      toast("Agreement uploaded privately");
      try {
        await fetchAll();
      } catch {
        return;
      }
      openPropertyDetails(propertyId);
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
      if (!(await saveDocumentMetadata(propertyId, file, path, contentType)))
        return;
      await reopenPropertyDetails(propertyId);
    }

    async function removeUploadedFile(path) {
      try {
        const { error } = await repository.remove(path);
        return !error;
      } catch {
        return false;
      }
    }

    return { uploadPropertyDocument };
  }

  window.PropertyDeskDocumentUpload = Object.freeze({ create });
})();
