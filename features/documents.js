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
      let uploadError;
      try {
        ({ error: uploadError } = await state.client.storage
          .from("pd-private-agreements")
          .upload(path, file, { contentType, upsert: false }));
      } catch (error) {
        toast(`Agreement upload failed: ${error.message || "Check your connection and try again."}`);
        return;
      }
      if (uploadError) {
        toast(`Agreement upload failed: ${uploadError.message}`);
        return;
      }

      let error;
      try {
        ({ error } = await state.client.from("pd_documents").insert({
          user_id: state.workspaceOwnerId,
          property_id: propertyId,
          account_id: null,
          file_name: file.name,
          storage_path: path,
          content_type: file.type || contentType,
          file_size: file.size,
        }));
      } catch (requestError) {
        toast(`Agreement record status couldn't be confirmed. Reload the property details before retrying; the private file was kept to avoid breaking a saved record. ${requestError.message || "Check your connection and try again."}`);
        return;
      }
      if (error) {
        const cleaned = await removeUploadedFile(path);
        toast(`Agreement record failed${cleaned ? "; uploaded file removed" : "; uploaded file may need cleanup"}. ${error.message}`);
        return;
      }

      toast("Agreement uploaded privately");
      try {
        await fetchAll();
      } catch {
        return;
      }
      openPropertyDetails(propertyId);
    }

    async function deletePropertyDocument(id) {
      const doc = state.documents.find((item) => item.id === id);
      const propertyId = state.selectedPropertyId;
      if (!doc || !propertyId || doc.property_id !== propertyId || doc.user_id !== state.workspaceOwnerId) return;
      if (!confirm(`Permanently delete “${doc.file_name}” from this property? This cannot be undone.`)) return;

      let storageError;
      try {
        ({ error: storageError } = await state.client.storage
          .from("pd-private-agreements")
          .remove([doc.storage_path]));
      } catch (error) {
        toast(`Agreement removal failed: ${error.message || "Check your connection and try again."}`);
        return;
      }
      if (storageError) {
        toast(`Agreement removal failed: ${storageError.message}`);
        return;
      }
      let error;
      try {
        ({ error } = await state.client.from("pd_documents")
          .delete()
          .eq("id", doc.id)
          .eq("user_id", state.workspaceOwnerId)
          .eq("property_id", propertyId));
      } catch (requestError) {
        toast(`File deleted, but its document record could not be removed: ${requestError.message || "Check your connection and try again."}`);
        return;
      }
      if (error) {
        toast(`File deleted, but its document record could not be removed: ${error.message}`);
        return;
      }

      toast("Agreement deleted");
      try {
        await fetchAll();
      } catch {
        return;
      }
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
      let data;
      let error;
      try {
        ({ data, error } = await state.client.storage
          .from("pd-private-agreements")
          .createSignedUrl(doc.storage_path, 60));
      } catch (requestError) {
        viewer.close();
        toast(`Agreement link failed: ${requestError.message || "Check your connection and try again."}`);
        return;
      }
      if (error) {
        viewer.close();
        toast(`Agreement link failed: ${error.message}`);
        return;
      }
      viewer.location.href = data.signedUrl;
    }

    async function removeUploadedFile(path) {
      try {
        const { error } = await state.client.storage
          .from("pd-private-agreements")
          .remove([path]);
        return !error;
      } catch {
        return false;
      }
    }

    return { uploadPropertyDocument, deletePropertyDocument, openPropertyDocument };
  }

  window.PropertyDeskDocuments = { create };
})();
