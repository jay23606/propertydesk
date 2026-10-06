/* Parse user-provided CSV text into source-numbered records. */
(() => {
  "use strict";

  function parseCSV(text) {
    const rows = [];
    let row = [],
      field = "",
      quoted = false,
      afterQuote = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i],
        next = text[i + 1];
      if (quoted) {
        if (char === '"' && next === '"') {
          field += '"';
          i++;
        } else if (char === '"') {
          quoted = false;
          afterQuote = true;
        } else field += char;
      } else if (afterQuote && char !== "," && char !== "\n" && char !== "\r") {
        throw new Error("CSV has unexpected characters after a quoted field.");
      } else if (char === '"') {
        if (field.length)
          throw new Error("CSV has a quote inside an unquoted field.");
        quoted = true;
      } else if (char === ",") {
        row.push(field);
        field = "";
        afterQuote = false;
      } else if (char === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
        afterQuote = false;
      } else if (char !== "\r") field += char;
    }
    if (quoted) throw new Error("CSV has an unclosed quoted field.");
    if (field || row.length) {
      row.push(field);
      rows.push(row);
    }

    const headers = (rows.shift() || []).map((value) => value.trim());
    if (headers.length) headers[0] = headers[0].replace(/^\uFEFF/, "");
    if (headers.some((value) => !value))
      throw new Error("CSV has an empty column heading.");
    if (new Set(headers).size !== headers.length)
      throw new Error("CSV has duplicate column headings.");
    return rows
      .map((values, index) => {
        if (!values.some((value) => value.trim())) return null;
        const record = Object.fromEntries(
          headers.map((header, column) => [
            header,
            (values[column] || "").trim(),
          ]),
        );
        Object.defineProperty(record, "_source_row", {
          value: index + 2,
          enumerable: false,
        });
        if (values.length > headers.length)
          Object.defineProperty(record, "_parse_error", {
            value: "This row has more values than the CSV column headings.",
            enumerable: false,
          });
        return record;
      })
      .filter(Boolean);
  }

  const parser = Object.freeze({ parseCSV });
  globalThis.PropertyDeskCsvParser = parser;
  if (typeof module !== "undefined" && module.exports) module.exports = parser;
})();
