/* Export the current account register as a spreadsheet-friendly CSV. */
(() => {
  "use strict";

  function createReportExport({
    $,
    state,
    todayIso,
    prettyType,
    accountBalance,
    downloadBlob = (blob, filename) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
  }) {
    function csvCell(value) {
      const text = String(value ?? "");
      return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    }

    function downloadCSV(filename, headers, rows) {
      const csv = [headers, ...rows]
        .map((row) => row.map(csvCell).join(","))
        .join("\r\n");
      downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), filename);
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
        state.accounts.map((account) => [
          account.name,
          prettyType(account.account_type),
          state.properties.find((property) => property.id === account.property_id)?.name || "",
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

    return { attachEvents, exportReport };
  }

  window.PropertyDeskReportExport = Object.freeze({ create: createReportExport });
})();
