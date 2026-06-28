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

const ACCENT = [91, 140, 255]; // #5b8cff
const ACCENT_DK = [58, 99, 196]; // darker accent for a subtle vertical gradient
const WHITE = [255, 255, 255];

// Minimal ascending bar-chart mark on a brand-accent tile.
function makeIcon(size, maskable) {
  // Full-bleed accent background (works for both maskable and normal icons).
  const bw = size * 0.15; // bar width
  const gap = size * 0.075; // gap between bars
  const totalW = 3 * bw + 2 * gap;
  const startX = (size - totalW) / 2;
  const baseline = size * 0.74;
  const heights = [0.26, 0.4, 0.54].map((h) => h * size);
  const radius = bw * 0.28;

  function inBar(x, y, bx, top) {
    if (x < bx || x > bx + bw || y < top || y > baseline) return false;
    // round the top corners
    const rx = Math.min(x - bx, bx + bw - x);
    if (y < top + radius && rx < radius) {
      const dx = radius - rx;
      const dy = radius - (y - top);
      if (dx * dx + dy * dy > radius * radius) return false;
    }
    return true;
  }

  return (x, y) => {
    // subtle top-to-bottom gradient on the accent background
    const t = y / size;
    const base = [
      Math.round(ACCENT[0] + (ACCENT_DK[0] - ACCENT[0]) * t),
      Math.round(ACCENT[1] + (ACCENT_DK[1] - ACCENT[1]) * t),
      Math.round(ACCENT[2] + (ACCENT_DK[2] - ACCENT[2]) * t),
    ];
    for (let i = 0; i < 3; i++) {
      const bx = startX + i * (bw + gap);
      if (inBar(x, y, bx, baseline - heights[i])) {
        return [WHITE[0], WHITE[1], WHITE[2], 255];
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
