/* Keep private agreement storage and metadata queries behind one adapter. */
(() => {
  "use strict";

  const BUCKET = "pd-private-agreements";
  const TABLE = "pd_documents";

  function create(clientSource) {
    function client() {
      const resolved =
        typeof clientSource === "function" ? clientSource() : clientSource;
      if (!resolved) throw new Error("Document storage is unavailable until sign-in.");
      return resolved;
    }

    return {
      upload(path, file, contentType) {
        return client().storage
          .from(BUCKET)
          .upload(path, file, { contentType, upsert: false });
      },
      insertMetadata(record) {
        return client().from(TABLE).insert(record);
      },
      remove(path) {
        return client().storage.from(BUCKET).remove([path]);
      },
      deleteMetadata(id, ownerId, propertyId) {
        return client()
          .from(TABLE)
          .delete()
          .eq("id", id)
          .eq("user_id", ownerId)
          .eq("property_id", propertyId);
      },
      signedUrl(path, expiresIn) {
        return client().storage
          .from(BUCKET)
          .createSignedUrl(path, expiresIn);
      },
    };
  }

  window.PropertyDeskDocumentRepository = Object.freeze({ create });
})();
