/* Render private agreements attached to a property. */
(() => {
  "use strict";

  function create({ fmtDate, esc }) {
    function propertyDocumentsHTML(propertyDocs) {
      return `<div class="detail-section">
        <h3>Agreements and documents</h3>
        <p class="field-hint">Files are private to your workspace. Select an agreement name to open or download it in your browser. PDFs, DOCX, and JPEG agreements up to 15 MB are supported.</p>
        <label class="button secondary file-button">↑ Upload agreement<input type="file" data-property-document accept="application/pdf,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx,image/jpeg,.jpg,.jpeg">
        </label>
        <div class="document-list">${
          propertyDocs.length
            ? propertyDocs
                .map(
                  (doc) => `<div class="document-row">
        <span>▤</span>
        <div>
        <a class="document-name-link" href="#" data-open-document="${esc(doc.id)}">${esc(doc.file_name)}</a>
        <small>${esc(doc.content_type || "Document")} · ${fmtDate(String(doc.created_at || "").slice(0, 10))}</small>
        </div>
        <button type="button" class="button secondary compact document-delete" data-delete-document="${esc(doc.id)}" aria-label="Delete ${esc(doc.file_name)}">Delete</button>
        </div>`,
                )
                .join("")
            : '<p class="list-empty">No agreement files attached yet.</p>'
        }</div>
        </div>`;
    }

    return { propertyDocumentsHTML };
  }

  window.PropertyDeskPropertyDocumentsView = Object.freeze({ create });
})();
