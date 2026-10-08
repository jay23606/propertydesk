/* Validate and collect the private agreement files included in a backup. */
(() => {
  "use strict";

  function assertWorkspacePath(doc, ownerPrefix) {
    if (doc.storage_path && doc.storage_path.startsWith(ownerPrefix)) return;
    throw new Error(
      "An agreement record has an invalid private storage path. No backup was downloaded.",
    );
  }

  function safeArchiveSegment(value, fallback) {
    const safeValue = String(value || fallback)
      .normalize("NFKC")
      .replace(/[^\w.-]/g, "_")
      .slice(0, 100);
    return safeValue && !/^\.+$/.test(safeValue) ? safeValue : fallback;
  }

  function archivePathFor(doc) {
    const propertyId = safeArchiveSegment(doc.property_id, "unassigned");
    const documentId = safeArchiveSegment(doc.id, "document");
    const safeName =
      String(doc.file_name || "agreement")
        .normalize("NFKC")
        .replace(/[^\w.-]/g, "_")
        .slice(-100) || "agreement";
    return `agreements/${propertyId}/${documentId}-${safeName}`;
  }

  function archiveManifestRecord(doc, path, byteLength) {
    return {
      path,
      file_name: doc.file_name,
      content_type: doc.content_type,
      file_size: byteLength,
      property_id: doc.property_id,
      account_id: doc.account_id,
    };
  }

  async function downloadAgreement(repository, doc) {
    const { data, error } = await repository.download(doc.storage_path);
    if (!error && data) return data;
    throw new Error(
      `Could not download agreement “${doc.file_name || "file"}”. ${error?.message || ""}`,
    );
  }

  async function collect({ documents, repository, workspaceOwnerId }) {
    const includedFiles = [];
    const entries = [];
    const ownerPrefix = `${workspaceOwnerId}/`;
    for (const doc of documents) {
      assertWorkspacePath(doc, ownerPrefix);
      const data = await downloadAgreement(repository, doc);
      const path = archivePathFor(doc);
      const bytes = new Uint8Array(await data.arrayBuffer());
      entries.push({ name: path, data: bytes });
      includedFiles.push(archiveManifestRecord(doc, path, bytes.byteLength));
    }

    return { entries, includedFiles };
  }

  window.PropertyDeskBackupAgreementFiles = Object.freeze({ collect });
})();
