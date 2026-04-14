// Minimal PNG generator using only Node.js built-ins
// Creates simple colored icons for PWA

import { createWriteStream, mkdirSync } from 'fs';
import { createDeflate } from 'zlib';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '../public/icons');

mkdirSync(OUT, { recursive: true });

function writePNG(filepath, size) {
  return new Promise((resolve) => {
    const PNG_SIG = Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);

    function chunk(type, data) {
      const typeBytes = Buffer.from(type, 'ascii');
      const len = Buffer.allocUnsafe(4);
      len.writeUInt32BE(data.length);
      const crc = crc32(Buffer.concat([typeBytes, data]));
      const crcBuf = Buffer.allocUnsafe(4);
      crcBuf.writeUInt32BE(crc >>> 0);
      return Buffer.concat([len, typeBytes, data, crcBuf]);
    }

    // IHDR
    const ihdr = Buffer.allocUnsafe(13);
    ihdr.writeUInt32BE(size, 0);   // width
    ihdr.writeUInt32BE(size, 4);   // height
    ihdr[8] = 8;  // bit depth
    ihdr[9] = 2;  // color type: RGB
    ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

    // Build raw image data
    // Dark background #080d1a = r:8, g:13, b:26
    // with a green (#00e5b0) bar in the middle
    const rawRows = [];
    for (let y = 0; y < size; y++) {
      const row = Buffer.allocUnsafe(1 + size * 3);
      row[0] = 0; // filter type: None
      for (let x = 0; x < size; x++) {
        const off = 1 + x * 3;
        // Simple gradient background
        row[off]   = 8;  // R: dark bg
        row[off+1] = 13; // G
        row[off+2] = 26; // B

        // Draw 3 bars (chart)
        const pad = Math.floor(size * 0.15);
        const bw = Math.floor(size * 0.12);
        const base = size - pad;

        // Bar 1
        const b1x = pad;
        const b1h = Math.floor(size * 0.3);
        if (x >= b1x && x < b1x + bw && y >= base - b1h && y < base) {
          row[off] = 0; row[off+1] = Math.floor(229 * 0.65); row[off+2] = Math.floor(176 * 0.65);
        }
        // Bar 2
        const b2x = pad + Math.floor(bw * 1.6);
        const b2h = Math.floor(size * 0.45);
        if (x >= b2x && x < b2x + bw && y >= base - b2h && y < base) {
          row[off] = 0; row[off+1] = Math.floor(229 * 0.82); row[off+2] = Math.floor(176 * 0.82);
        }
        // Bar 3
        const b3x = pad + Math.floor(bw * 3.2);
        const b3h = Math.floor(size * 0.6);
        if (x >= b3x && x < b3x + bw && y >= base - b3h && y < base) {
          row[off] = 0; row[off+1] = 229; row[off+2] = 176;
        }

        // Arrow triangle (top right)
        const ax = Math.floor(size * 0.75);
        const ay = Math.floor(size * 0.12);
        const aw = Math.floor(size * 0.12);
        // Simple upward triangle
        const relX = x - ax;
        const relY = y - ay;
        if (relY >= 0 && relY < aw && Math.abs(relX) <= aw / 2 - relY * aw / (2 * aw)) {
          row[off] = 0; row[off+1] = 229; row[off+2] = 176;
        }
      }
      rawRows.push(row);
    }

    const rawData = Buffer.concat(rawRows);

    // Compress
    const deflate = createDeflate({ level: 6 });
    const chunks = [];
    deflate.on('data', (c) => chunks.push(c));
    deflate.on('end', () => {
      const compressed = Buffer.concat(chunks);
      const png = Buffer.concat([
        PNG_SIG,
        chunk('IHDR', ihdr),
        chunk('IDAT', compressed),
        chunk('IEND', Buffer.alloc(0)),
      ]);
      require('fs').writeFileSync(filepath, png);
      console.log(`✓ ${path.basename(filepath)} (${size}x${size})`);
      resolve();
    });
    deflate.write(rawData);
    deflate.end();
  });
}

// CRC32 table
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return crc ^ 0xFFFFFFFF;
}

// createWriteStream not needed — using writeFileSync via eval workaround
// Use dynamic import workaround for require in ESM
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

for (const size of [180, 192, 512]) {
  await writePNG(path.join(OUT, `icon-${size}.png`), size);
}
console.log('All icons generated!');
