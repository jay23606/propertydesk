/* Render one prepared transaction row and its audit actions. */
(() => {
  "use strict";

  function transactionActionHTML(record, item, isVoided, esc) {
    if (isVoided) return '<span class="muted">Voided</span>';
    return `<button type="button" class="text-button" data-correct-transaction data-kind="${record.kind}" data-id="${esc(item.id)}">Correct</button> <button type="button" class="text-button" data-void-transaction data-kind="${record.kind}" data-id="${esc(item.id)}">Void</button>`;
  }

  function transactionMemoHTML(record, item, esc) {
    const voidReason = item.void_reason
      ? `<small class='table-subtext'>${esc(item.void_reason)}</small>`
      : "";
    const correctionNote = record.correctionOf
      ? '<small class="table-subtext">Corrected replacement</small>'
      : "";
    return `${esc(item.memo || "—")}${voidReason}${correctionNote}`;
  }

  function createTransactionRowView({ esc, money, fmtDate }) {
    function transactionRowHTML(record) {
      const item = record.item;
      const isExpense = record.kind === "expense";
      const isVoided = item.status === "voided";

      return `<tr class='${isVoided ? "transaction-voided" : ""}'>
        <td>${fmtDate(record.date)}</td>
        <td><span class='${isExpense ? "expense-pill" : "status-pill"}'>${record.transactionType}${isVoided ? " · voided" : ""}</span></td>
        <td><strong>${esc(record.propertyName)}</strong><br>${esc(record.partyName)}</td>
        <td>${esc(record.detailsType)}</td>
        <td><strong>${isExpense ? "−" : ""}${money(record.amount)}</strong></td>
        <td>${esc(record.paymentMethod)}</td>
        <td>${transactionMemoHTML(record, item, esc)}</td>
        <td>${transactionActionHTML(record, item, isVoided, esc)}</td>
      </tr>`;
    }

    return Object.freeze({ transactionRowHTML });
  }

  window.PropertyDeskTransactionRowView = Object.freeze({
    create: createTransactionRowView,
  });
})();
