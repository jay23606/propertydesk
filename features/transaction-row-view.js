/* Render one prepared transaction row and its audit actions. */
(() => {
  "use strict";

  function createTransactionRowView({ esc, money, fmtDate }) {
    function transactionRowHTML(record) {
      const item = record.item;
      const isExpense = record.kind === "expense";
      const isVoided = item.status === "voided";
      const actionButtons = isVoided
        ? '<span class="muted">Voided</span>'
        : `<button type="button" class="text-button" data-correct-transaction data-kind="${record.kind}" data-id="${esc(item.id)}">Correct</button> <button type="button" class="text-button" data-void-transaction data-kind="${record.kind}" data-id="${esc(item.id)}">Void</button>`;

      return `<tr class='${isVoided ? "transaction-voided" : ""}'>
        <td>${fmtDate(record.date)}</td>
        <td><span class='${isExpense ? "expense-pill" : "status-pill"}'>${record.transactionType}${isVoided ? " · voided" : ""}</span></td>
        <td><strong>${esc(record.propertyName)}</strong><br>${esc(record.partyName)}</td>
        <td>${esc(record.detailsType)}</td>
        <td><strong>${isExpense ? "−" : ""}${money(record.amount)}</strong></td>
        <td>${esc(record.paymentMethod)}</td>
        <td>${esc(item.memo || "—")}${item.void_reason ? `<small class='table-subtext'>${esc(item.void_reason)}</small>` : ""}${record.correctionOf ? '<small class="table-subtext">Corrected replacement</small>' : ""}</td>
        <td>${actionButtons}</td>
      </tr>`;
    }

    return Object.freeze({ transactionRowHTML });
  }

  window.PropertyDeskTransactionRowView = Object.freeze({
    create: createTransactionRowView,
  });
})();
