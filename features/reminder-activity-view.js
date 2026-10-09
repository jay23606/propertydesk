/* Render month-end reminder delivery history in workspace settings. */
(() => {
  "use strict";

  function createReminderActivityView({
    $,
    esc,
    fmtDate,
    fmtDateTime,
    money,
    model,
  }) {
    function renderReminderActivity() {
      const rows = model.buildRows();
      $("reminder-activity").innerHTML = rows.length
        ? rows
            .map(
              (
                row,
              ) => `<tr><td>${fmtDate(row.reminderMonth, { month: "short", year: "numeric" })}</td>
            <td>${esc(row.propertyLabel)}<small class="table-subtext">${esc(row.accountLabel)}</small></td>
            <td>${row.recipientIndex ? `Recipient ${esc(row.recipientIndex)}` : "No valid recipient"}</td>
            <td><span class="reminder-status reminder-${esc(row.status)}">${esc(row.statusLabel)}</span></td>
            <td>${esc(row.detail)}${row.unpaidDue != null ? `<small class="table-subtext">Unpaid due: ${money(row.unpaidDue)}</small>` : ""}</td>
            <td>${esc(fmtDateTime(row.attemptedAt))}</td></tr>`,
            )
            .join("")
        : '<tr><td colspan="6" class="muted">Reminder attempts will appear here. Reminders are off until you enable them in an account.</td></tr>';
    }

    return Object.freeze({ renderReminderActivity });
  }

  window.PropertyDeskReminderActivityView = Object.freeze({
    create: createReminderActivityView,
  });
})();
