/* Validate agreement file uploads and derive safe storage object names. */
(() => {
  "use strict";

  const CONTENT_TYPES = Object.freeze({
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
  });
  const MAX_FILE_SIZE = 15 * 1024 * 1024;

  function describe(file) {
    if (!file) return null;
    const extension = file.name.split(".").pop().toLowerCase();
    const contentType = CONTENT_TYPES[extension];
    if (!contentType || file.size > MAX_FILE_SIZE) return null;

    const safeName =
      file.name
        .normalize("NFKC")
        .replace(/[^\w.() -]/g, "_")
        .replace(/\s+/g, "_")
        .slice(-100) || `agreement.${extension}`;
    return { contentType, safeName };
  }

  window.PropertyDeskDocumentUploadPolicy = Object.freeze({ describe });
})();
