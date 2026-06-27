// Generates the PWA PNG icons with no external dependencies (Node's zlib only).
// Draws a "coin" mark on the brand background. Re-run with: node scripts/gen-icons.js
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (~c) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(size, pixel) {
  const bytesPerRow = size * 4;
  const raw = Buffer.alloc((bytesPerRow + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (bytesPerRow + 1)] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x, y);
      const o = y * (bytesPerRow + 1) + 1 + x * 4;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
      raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const BG = [11, 15, 23]; // #0b0f17
const ACCENT = [91, 140, 255]; // #5b8cff
const WHITE = [231, 236, 245];

function makeIcon(size, maskable) {
  const cx = size / 2;
  const cy = size / 2;
  const coin = size * (maskable ? 0.3 : 0.34);
  const ring = coin * 0.7;
  const bar = coin * 0.16; // the "₹"-like double bar thickness
  return (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    const d = Math.sqrt(dx * dx + dy * dy);
    // Maskable: full-bleed accent. Normal: brand-dark with coin.
    let base = maskable ? ACCENT : BG;
    if (d <= coin) base = ACCENT;
    if (d <= ring) base = WHITE;
    // Two horizontal bars near the top of the inner circle (rupee-ish).
    if (d <= ring) {
      const ny = y - (cy - ring * 0.55);
      const ny2 = y - (cy - ring * 0.2);
      if ((Math.abs(ny) < bar / 2 || Math.abs(ny2) < bar / 2) && Math.abs(dx) < ring * 0.55) {
        base = ACCENT;
      }
      // vertical stem
      if (x > cx - bar / 2 && x < cx + bar / 2 && y > cy - ring * 0.55 && y < cy + ring * 0.5) {
        base = ACCENT;
      }
    }
    return [base[0], base[1], base[2], 255];
  };
}

const outDir = path.join(__dirname, "..", "public", "icons");
fs.mkdirSync(outDir, { recursive: true });

const targets = [
  { file: "icon-192.png", size: 192, maskable: false },
  { file: "icon-512.png", size: 512, maskable: false },
  { file: "icon-maskable-512.png", size: 512, maskable: true },
  { file: "apple-touch-icon.png", size: 180, maskable: false },
];

for (const t of targets) {
  const png = encodePng(t.size, makeIcon(t.size, t.maskable));
  fs.writeFileSync(path.join(outDir, t.file), png);
  console.log("wrote", t.file, png.length, "bytes");
}
