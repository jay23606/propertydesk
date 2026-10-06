/* Shared date parsing, formatting, and calendar-boundary helpers. */
(() => {
  "use strict";

  const dateOnly = (value) => (value ? new Date(`${value}T12:00:00`) : null);
  const fmtDate = (
    value,
    options = { month: "short", day: "numeric", year: "numeric" },
  ) => {
    const date = dateOnly(value);
    return date ? date.toLocaleDateString(undefined, options) : "—";
  };
  const todayIso = () => {
    const date = new Date();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
  };
  const monthStart = () => {
    const date = new Date();
    date.setDate(1);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${date.getFullYear()}-${month}-01`;
  };
  const monthEnd = () => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1, 0);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
  };

  const monthDateWithAnchor = (
    date,
    monthOffset,
    anchorDay = date.getDate(),
  ) => {
    const first = new Date(
      date.getFullYear(),
      date.getMonth() + monthOffset,
      1,
      12,
    );
    const lastDay = new Date(
      first.getFullYear(),
      first.getMonth() + 1,
      0,
      12,
    ).getDate();
    return new Date(
      first.getFullYear(),
      first.getMonth(),
      Math.min(anchorDay, lastDay),
      12,
    );
  };

  const dateUtils = Object.freeze({
    dateOnly,
    fmtDate,
    todayIso,
    monthStart,
    monthEnd,
    monthDateWithAnchor,
  });
  globalThis.PropertyDeskDateUtils = dateUtils;
  if (typeof window !== "undefined")
    window.PropertyDeskDateUtils = Object.freeze({
      dateOnly,
      fmtDate,
      todayIso,
      monthStart,
      monthEnd,
      monthDateWithAnchor,
    });
  if (typeof module !== "undefined" && module.exports)
    module.exports = dateUtils;
})();
