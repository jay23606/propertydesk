/* Parse user-provided CSV text into source-numbered records. */
(() => {
  "use strict";

  function appendField(context) {
    context.row.push(context.field);
    context.field = "";
    context.afterQuote = false;
  }

  function appendRow(context) {
    appendField(context);
    context.rows.push(context.row);
    context.row = [];
  }

  function consumeQuotedCharacter(context, char, next, index) {
    if (char === '"' && next === '"') {
      context.field += '"';
      return index + 1;
    }
    if (char === '"') {
      context.quoted = false;
      context.afterQuote = true;
      return index;
    }
    context.field += char;
    return index;
  }

  function consumeUnquotedCharacter(context, char, next, index) {
    if (context.afterQuote && char !== "," && char !== "\n" && char !== "\r")
      throw new Error("CSV has unexpected characters after a quoted field.");
    if (char === '"') {
      if (context.field.length)
        throw new Error("CSV has a quote inside an unquoted field.");
      context.quoted = true;
    } else if (char === ",") appendField(context);
    else if (char === "\n") appendRow(context);
    else if (char !== "\r") context.field += char;
    return index;
  }

  function recordsFromRows(rows) {
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

  function parseCSV(text) {
    const context = {
      rows: [],
      row: [],
      field: "",
      quoted: false,
      afterQuote: false,
    };
    for (let i = 0; i < text.length; i++) {
      const char = text[i],
        next = text[i + 1];
      i = context.quoted
        ? consumeQuotedCharacter(context, char, next, i)
        : consumeUnquotedCharacter(context, char, next, i);
    }
    if (context.quoted) throw new Error("CSV has an unclosed quoted field.");
    if (context.field || context.row.length) appendRow(context);
    return recordsFromRows(context.rows);
  }

  const parser = Object.freeze({ parseCSV });
  globalThis.PropertyDeskCsvParser = parser;
  if (typeof module !== "undefined" && module.exports) module.exports = parser;
})();
