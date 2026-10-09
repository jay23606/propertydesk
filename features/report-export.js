/* Export the current account register as a spreadsheet-friendly CSV. */
(() => {
  "use strict";

  function createReportExport({
    $,
    getAccounts,
    getProperties,
    todayIso,
    prettyType,
    accountBalance,
    downloadBlob,
  }) {
    function csvCell(value) {
      const text = String(value ?? "");
      return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    }

    function downloadCSV(filename, headers, rows) {
      const csv = [headers, ...rows]
        .map((row) => row.map(csvCell).join(","))
        .join("\r\n");
      downloadBlob(
        new Blob([csv], { type: "text/csv;charset=utf-8" }),
        filename,
      );
    }

    function exportReport() {
      downloadCSV(
        `propertydesk-accounts-${todayIso()}.csv`,
        [
          "account_name",
          "account_type",
          "property",
          "party",
          "monthly_due",
          "estimated_on_time_loan_balance",
          "next_due_date",
          "status",
        ],
        getAccounts().map((account) => [
          account.name,
          prettyType(account.account_type),
          getProperties().find(
            (property) => property.id === account.property_id,
          )?.name || "",
          account.party_name,
          account.payment_amount,
          account.account_type === "rental" ? "" : accountBalance(account),
          account.next_due_date,
          account.status,
        ]),
      );
    }

    function attachEvents() {
      $("export-report").addEventListener("click", exportReport);
    }

    return Object.freeze({ attachEvents });
  }

  window.PropertyDeskReportExport = Object.freeze({
    create: createReportExport,
  });
})();
