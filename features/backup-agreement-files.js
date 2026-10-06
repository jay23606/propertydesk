/* Validate and collect the private agreement files included in a backup. */
(() => {
  "use strict";

  async function collect({ documents, client, workspaceOwnerId }) {
    const includedFiles = [];
    const entries = [];
    const ownerPrefix = `${workspaceOwnerId}/`;

    for (const doc of documents) {
      if (!doc.storage_path || !doc.storage_path.startsWith(ownerPrefix)) {
        throw new Error(
          "An agreement record has an invalid private storage path. No backup was downloaded.",
        );
      }
      const { data, error } = await client.storage
        .from("pd-private-agreements")
        .download(doc.storage_path);
      if (error || !data) {
        throw new Error(
          `Could not download agreement “${doc.file_name || "file"}”. ${error?.message || ""}`,
        );
      }
      const safeName =
        String(doc.file_name || "agreement")
          .normalize("NFKC")
          .replace(/[^\w.-]/g, "_")
          .slice(-100) || "agreement";
      const path = `agreements/${doc.property_id || "unassigned"}/${doc.id}-${safeName}`;
      const bytes = new Uint8Array(await data.arrayBuffer());
      entries.push({ name: path, data: bytes });
      includedFiles.push({
        path,
        file_name: doc.file_name,
        content_type: doc.content_type,
        file_size: bytes.byteLength,
        property_id: doc.property_id,
        account_id: doc.account_id,
      });
    }

    return { entries, includedFiles };
  }

  window.PropertyDeskBackupAgreementFiles = Object.freeze({ collect });
})();
