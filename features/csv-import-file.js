/* Own the shared CSV file-selection, parsing, status, and reset lifecycle. */
(() => {
  "use strict";

  function create({
    input,
    status,
    parseCSV,
    emptyMessage,
    failurePrefix,
    handleRows,
  }) {
    async function importFile(file) {
      status.textContent = "";
      status.classList.remove("success");
      try {
        const rows = parseCSV(await file.text());
        if (!rows.length) throw new Error(emptyMessage);
        handleRows(file, rows);
      } catch (error) {
        status.textContent = `${failurePrefix}${error.message}`;
      }
      input.value = "";
    }

    function attachEvents() {
      input.addEventListener("change", (event) => {
        if (event.target.files[0]) return importFile(event.target.files[0]);
      });
    }

    return Object.freeze({ attachEvents });
  }

  window.PropertyDeskCsvImportFile = Object.freeze({ create });
})();
