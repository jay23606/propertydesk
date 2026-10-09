/* Shared date parsing, formatting, and calendar-boundary helpers. */
(() => {
  "use strict";

  const now = () => new Date();
  const timestampIso = () => now().toISOString();
  const dateOnly = (value) => (value ? new Date(`${value}T12:00:00`) : null);
  const fmtDate = (
    value,
    options = { month: "short", day: "numeric", year: "numeric" },
  ) => {
    const date = dateOnly(value);
    return date ? date.toLocaleDateString(undefined, options) : "—";
  };
  const fmtDateTime = (value) => new Date(value).toLocaleString();
  const isoDate = (date) => {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
  };
  const todayIso = () => isoDate(now());
  const monthStart = () => {
    const date = now();
    date.setDate(1);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${date.getFullYear()}-${month}-01`;
  };
  const monthEnd = () => {
    const date = now();
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
    now,
    timestampIso,
    dateOnly,
    fmtDate,
    fmtDateTime,
    isoDate,
    todayIso,
    monthStart,
    monthEnd,
    monthDateWithAnchor,
  });
  if (typeof window !== "undefined") {
    window.PropertyDeskDateUtils = dateUtils;
    globalThis.PropertyDeskDateUtils = window.PropertyDeskDateUtils;
  } else {
    globalThis.PropertyDeskDateUtils = dateUtils;
  }
  if (typeof module !== "undefined" && module.exports)
    module.exports = dateUtils;
})();
