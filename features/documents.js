/* PropertyDesk private property-document workflows. */
(() => {
  "use strict";

  function create(context) {
    const {
      state,
      toast,
      fetchAll,
      openPropertyDetails,
      confirm = (message) => window.confirm(message),
      openWindow = (...args) => window.open(...args),
      makeId = () => crypto.randomUUID(),
    } = context;

    async function uploadPropertyDocument(input) {
      const file = input.files?.[0];
      const propertyId = state.selectedPropertyId;
      input.value = "";
      if (!file || !propertyId) return;

      const extension = file.name.split(".").pop().toLowerCase();
      const contentTypes = {
        pdf: "application/pdf",
        docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
      };
      const contentType = contentTypes[extension];
      if (!contentType || file.size > 15 * 1024 * 1024) {
        toast("Choose a PDF, DOCX, or JPEG agreement under 15 MB");
        return;
      }

      const safeName = file.name.normalize("NFKC")
        .replace(/[^\w.() -]/g, "_")
        .replace(/\s+/g, "_")
        .slice(-100) || `agreement.${extension}`;
      const path = `${state.workspaceOwnerId}/${propertyId}/${makeId()}-${safeName}`;
      const { error: uploadError } = await state.client.storage
        .from("pd-private-agreements")
        .upload(path, file, { contentType, upsert: false });
      if (uploadError) {
        toast(`Agreement upload failed: ${uploadError.message}`);
        return;
      }

      const { error } = await state.client.from("pd_documents").insert({
        user_id: state.workspaceOwnerId,
        property_id: propertyId,
        account_id: null,
        file_name: file.name,
        storage_path: path,
        content_type: file.type || contentType,
        file_size: file.size,
      });
      if (error) {
        await state.client.storage.from("pd-private-agreements").remove([path]);
        toast(`Agreement record failed: ${error.message}`);
        return;
      }

      toast("Agreement uploaded privately");
      await fetchAll();
      openPropertyDetails(propertyId);
    }

    async function deletePropertyDocument(id) {
      const doc = state.documents.find((item) => item.id === id);
      const propertyId = state.selectedPropertyId;
      if (!doc || !propertyId || doc.property_id !== propertyId || doc.user_id !== state.workspaceOwnerId) return;
      if (!confirm(`Permanently delete “${doc.file_name}” from this property? This cannot be undone.`)) return;

      const { error: storageError } = await state.client.storage
        .from("pd-private-agreements")
        .remove([doc.storage_path]);
      if (storageError) {
        toast(`Agreement removal failed: ${storageError.message}`);
        return;
      }
      const { error } = await state.client.from("pd_documents")
        .delete()
        .eq("id", doc.id)
        .eq("user_id", state.workspaceOwnerId)
        .eq("property_id", propertyId);
      if (error) {
        toast(`File deleted, but its document record could not be removed: ${error.message}`);
        return;
      }

      toast("Agreement deleted");
      await fetchAll();
      openPropertyDetails(propertyId);
    }

    async function openPropertyDocument(id) {
      const doc = state.documents.find((item) => item.id === id);
      if (!doc || doc.user_id !== state.workspaceOwnerId) return;
      const viewer = openWindow("about:blank", "_blank");
      if (!viewer) {
        toast("Allow pop-ups to open this agreement; you can also use Download.");
        return;
      }
      viewer.opener = null;
      const { data, error } = await state.client.storage
        .from("pd-private-agreements")
        .createSignedUrl(doc.storage_path, 60);
      if (error) {
        viewer.close();
        toast(`Agreement link failed: ${error.message}`);
        return;
      }
      viewer.location.href = data.signedUrl;
    }

    return { uploadPropertyDocument, deletePropertyDocument, openPropertyDocument };
  }

  window.PropertyDeskDocuments = { create };
})();
