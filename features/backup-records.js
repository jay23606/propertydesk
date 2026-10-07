/* Read the workspace tables included in a private backup. */
(() => {
  "use strict";

  function create({ tables, loadAllPages }) {
    async function load() {
      const values = await Promise.all(
        tables.map((table) => loadAllPages(table)),
      );
      return Object.fromEntries(
        tables.map((table, index) => [table, values[index]]),
      );
    }

    return Object.freeze({ tables, load });
  }

  window.PropertyDeskBackupRecords = Object.freeze({ create });
})();
