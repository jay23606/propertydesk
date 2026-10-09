/* Apply transaction history date, type, search, and ordering rules. */
(() => {
  "use strict";

  function createTransactionListFilterModel({ dateOnly }) {
    function matchesDatePeriod(date, period, now) {
      if (period === "all") return true;
      if (period === "month") {
        return (
          date?.getMonth() === now.getMonth() &&
          date?.getFullYear() === now.getFullYear()
        );
      }
      return period === "year" && date?.getFullYear() === now.getFullYear();
    }

    function matchesPeriodAndType(row, period, type, now) {
      const date = dateOnly(row.date);
      return (
        (type === "all" || type === row.kind) &&
        matchesDatePeriod(date, period, now)
      );
    }

    function filterRows(rows, { period, query, type, now }) {
      const normalizedQuery = query.trim().toLowerCase();
      return rows
        .filter((row) => matchesPeriodAndType(row, period, type, now))
        .filter(
          (row) => !normalizedQuery || row.searchText.includes(normalizedQuery),
        )
        .sort((left, right) =>
          String(right.date).localeCompare(String(left.date)),
        );
    }

    return Object.freeze({ filterRows });
  }

  window.PropertyDeskTransactionListFilterModel = Object.freeze({
    create: createTransactionListFilterModel,
  });
})();
