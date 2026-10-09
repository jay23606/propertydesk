/* Small dependency-free ZIP writer for private owner-side exports. Uses stored entries. */
(() => {
  "use strict";

  const encoder = new TextEncoder();
  const CRC_TABLE = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let value = n;
    for (let bit = 0; bit < 8; bit++)
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    CRC_TABLE[n] = value >>> 0;
  }

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes)
      crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }

  function toBytes(value) {
    if (typeof value === "string") return encoder.encode(value);
    if (value instanceof Uint8Array) return value;
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    if (ArrayBuffer.isView(value))
      return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    throw new TypeError("ZIP entry data must be text or binary bytes");
  }

  function entryName(value) {
    const name = String(value || "").replaceAll("\\", "/");
    if (
      !name ||
      name.startsWith("/") ||
      /^[a-z]:/i.test(name) ||
      name.split("/").some((part) => !part || part === "." || part === "..")
    ) {
      throw new Error(
        "ZIP entry names must be relative paths without traversal segments",
      );
    }
    return name;
  }

  function dosTimestamp(date) {
    if (!(date instanceof Date) || !Number.isFinite(date.getTime()))
      throw new TypeError("ZIP timestamp must be a valid Date.");
    const valid = date;
    const year = Math.max(1980, Math.min(2107, valid.getUTCFullYear()));
    return {
      time:
        (valid.getUTCHours() << 11) |
        (valid.getUTCMinutes() << 5) |
        Math.floor(valid.getUTCSeconds() / 2),
      day:
        ((year - 1980) << 9) |
        ((valid.getUTCMonth() + 1) << 5) |
        valid.getUTCDate(),
    };
  }

  function zipEntryData(entry, names) {
    const name = entryName(entry?.name),
      nameBytes = encoder.encode(name);
    if (nameBytes.length > 65535) throw new Error("ZIP entry name is too long");
    if (names.has(name)) throw new Error(`Duplicate ZIP entry: ${name}`);
    const bytes = toBytes(entry?.data);
    if (bytes.byteLength > 0xffffffff)
      throw new Error("ZIP entries cannot exceed 4 GiB");
    names.add(name);
    return { nameBytes, bytes, checksum: crc32(bytes) };
  }

  function localFileHeader(checksum, size, nameLength, stamp) {
    const header = new Uint8Array(30),
      view = new DataView(header.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 0x0800, true);
    view.setUint16(8, 0, true);
    view.setUint16(10, stamp.time, true);
    view.setUint16(12, stamp.day, true);
    view.setUint32(14, checksum, true);
    view.setUint32(18, size, true);
    view.setUint32(22, size, true);
    view.setUint16(26, nameLength, true);
    view.setUint16(28, 0, true);
    return header;
  }

  function centralDirectoryHeader(
    checksum,
    size,
    nameLength,
    localOffset,
    stamp,
  ) {
    const header = new Uint8Array(46),
      view = new DataView(header.buffer);
    view.setUint32(0, 0x02014b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 20, true);
    view.setUint16(8, 0x0800, true);
    view.setUint16(10, 0, true);
    view.setUint16(12, stamp.time, true);
    view.setUint16(14, stamp.day, true);
    view.setUint32(16, checksum, true);
    view.setUint32(20, size, true);
    view.setUint32(24, size, true);
    view.setUint16(28, nameLength, true);
    view.setUint16(30, 0, true);
    view.setUint16(32, 0, true);
    view.setUint16(34, 0, true);
    view.setUint16(36, 0, true);
    view.setUint32(38, 0, true);
    view.setUint32(42, localOffset, true);
    return header;
  }

  function endOfCentralDirectory(entryCount, centralSize, localOffset) {
    const header = new Uint8Array(22),
      view = new DataView(header.buffer);
    view.setUint32(0, 0x06054b50, true);
    view.setUint16(4, 0, true);
    view.setUint16(6, 0, true);
    view.setUint16(8, entryCount, true);
    view.setUint16(10, entryCount, true);
    view.setUint32(12, centralSize, true);
    view.setUint32(16, localOffset, true);
    view.setUint16(20, 0, true);
    return header;
  }

  function createZip(entries, timestamp) {
    if (!Array.isArray(entries) || entries.length > 65535)
      throw new Error("ZIP archive supports up to 65,535 entries");
    const names = new Set();
    const preparedEntries = entries.map((entry) => zipEntryData(entry, names));
    const stamp = dosTimestamp(timestamp);
    const localParts = [],
      centralParts = [];
    let localOffset = 0,
      centralSize = 0;
    for (const { nameBytes, bytes, checksum } of preparedEntries) {
      const size = bytes.byteLength,
        localHeader = localFileHeader(checksum, size, nameBytes.length, stamp),
        centralHeader = centralDirectoryHeader(
          checksum,
          size,
          nameBytes.length,
          localOffset,
          stamp,
        );
      localParts.push(localHeader, nameBytes, bytes);
      centralParts.push(centralHeader, nameBytes);
      localOffset += localHeader.length + nameBytes.length + size;
      centralSize += centralHeader.length + nameBytes.length;
      if (localOffset > 0xffffffff || centralSize > 0xffffffff)
        throw new Error("ZIP archive exceeds the standard ZIP32 size limit");
    }
    const end = endOfCentralDirectory(entries.length, centralSize, localOffset);
    return new Blob([...localParts, ...centralParts, end], {
      type: "application/zip",
    });
  }

  const helpers = Object.freeze({ createZip, crc32 });
  globalThis.PropertyDeskZipUtils = helpers;
  if (typeof module !== "undefined" && module.exports) module.exports = helpers;
})();
