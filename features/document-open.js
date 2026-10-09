/* Open owner-scoped agreements through short-lived signed URLs. */
(() => {
  "use strict";

  function create({ state, toast, openWindow, repository }) {
    async function openPropertyDocument(id) {
      const doc = state.documents.find((item) => item.id === id);
      if (!doc || doc.user_id !== state.workspaceOwnerId) return;
      const viewer = openWindow("about:blank", "_blank");
      if (!viewer) {
        toast(
          "Allow pop-ups to open this agreement; you can also use Download.",
        );
        return;
      }
      viewer.opener = null;
      let data;
      let error;
      try {
        ({ data, error } = await repository.signedUrl(doc.storage_path, 60));
      } catch (requestError) {
        viewer.close();
        toast(
          `Agreement link failed: ${requestError.message || "Check your connection and try again."}`,
        );
        return;
      }
      if (error) {
        viewer.close();
        toast(`Agreement link failed: ${error.message}`);
        return;
      }
      viewer.location.href = data.signedUrl;
    }

    return Object.freeze({ openPropertyDocument });
  }

  window.PropertyDeskDocumentOpen = Object.freeze({ create });
})();
