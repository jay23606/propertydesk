/* Small dependency-free ZIP writer for private owner-side exports. Uses stored entries. */
(() => {
  'use strict';

  const encoder = new TextEncoder();
  const CRC_TABLE = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let value = n;
    for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    CRC_TABLE[n] = value >>> 0;
  }

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }

  function toBytes(value) {
    if (typeof value === 'string') return encoder.encode(value);
    if (value instanceof Uint8Array) return value;
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    throw new TypeError('ZIP entry data must be text or binary bytes');
  }

  function entryName(value) {
    const name = String(value || '').replaceAll('\\', '/');
    if (!name || name.startsWith('/') || /^[a-z]:/i.test(name) || name.split('/').some(part => !part || part === '.' || part === '..')) {
      throw new Error('ZIP entry names must be relative paths without traversal segments');
    }
    return name;
  }

  function dosTimestamp(date) {
    const valid = date instanceof Date && Number.isFinite(date.getTime()) ? date : new Date();
    const year = Math.max(1980, Math.min(2107, valid.getUTCFullYear()));
    return {
      time: (valid.getUTCHours() << 11) | (valid.getUTCMinutes() << 5) | Math.floor(valid.getUTCSeconds() / 2),
      day: ((year - 1980) << 9) | ((valid.getUTCMonth() + 1) << 5) | valid.getUTCDate()
    };
  }

  function createZip(entries, timestamp = new Date()) {
    if (!Array.isArray(entries) || entries.length > 65535) throw new Error('ZIP archive supports up to 65,535 entries');
    const names = new Set(), localParts = [], centralParts = [], stamp = dosTimestamp(timestamp);
    let localOffset = 0, centralSize = 0;
    for (const entry of entries) {
      const name = entryName(entry?.name), nameBytes = encoder.encode(name), bytes = toBytes(entry?.data);
      if (nameBytes.length > 65535) throw new Error('ZIP entry name is too long');
      if (names.has(name)) throw new Error(`Duplicate ZIP entry: ${name}`);
      names.add(name);
      if (bytes.byteLength > 0xffffffff) throw new Error('ZIP entries cannot exceed 4 GiB');
      const checksum = crc32(bytes), flags = 0x0800;
      const localHeader = new Uint8Array(30), local = new DataView(localHeader.buffer);
      local.setUint32(0, 0x04034b50, true); local.setUint16(4, 20, true); local.setUint16(6, flags, true);
      local.setUint16(8, 0, true); local.setUint16(10, stamp.time, true); local.setUint16(12, stamp.day, true);
      local.setUint32(14, checksum, true); local.setUint32(18, bytes.byteLength, true); local.setUint32(22, bytes.byteLength, true);
      local.setUint16(26, nameBytes.length, true); local.setUint16(28, 0, true);
      localParts.push(localHeader, nameBytes, bytes);

      const centralHeader = new Uint8Array(46), central = new DataView(centralHeader.buffer);
      central.setUint32(0, 0x02014b50, true); central.setUint16(4, 20, true); central.setUint16(6, 20, true);
      central.setUint16(8, flags, true); central.setUint16(10, 0, true);
      central.setUint16(12, stamp.time, true); central.setUint16(14, stamp.day, true);
      central.setUint32(16, checksum, true); central.setUint32(20, bytes.byteLength, true); central.setUint32(24, bytes.byteLength, true);
      central.setUint16(28, nameBytes.length, true); central.setUint16(30, 0, true); central.setUint16(32, 0, true);
      central.setUint16(34, 0, true); central.setUint16(36, 0, true); central.setUint32(38, 0, true);
      central.setUint32(42, localOffset, true);
      centralParts.push(centralHeader, nameBytes);
      localOffset += localHeader.length + nameBytes.length + bytes.byteLength;
      centralSize += centralHeader.length + nameBytes.length;
      if (localOffset > 0xffffffff || centralSize > 0xffffffff) throw new Error('ZIP archive exceeds the standard ZIP32 size limit');
    }
    const end = new Uint8Array(22), endView = new DataView(end.buffer);
    endView.setUint32(0, 0x06054b50, true); endView.setUint16(4, 0, true); endView.setUint16(6, 0, true);
    endView.setUint16(8, entries.length, true); endView.setUint16(10, entries.length, true);
    endView.setUint32(12, centralSize, true); endView.setUint32(16, localOffset, true); endView.setUint16(20, 0, true);
    return new Blob([...localParts, ...centralParts, end], { type: 'application/zip' });
  }

  const helpers = Object.freeze({ createZip, crc32 });
  globalThis.PropertyDeskZipUtils = helpers;
  if (typeof module !== 'undefined' && module.exports) module.exports = helpers;
})();
