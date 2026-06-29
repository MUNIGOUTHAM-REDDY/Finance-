// Generates the 1024×1024 iOS app icon (bar-chart mark on a blue gradient).
// No deps (Node zlib only). Run: node ios/gen-appicon.js
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
  const t = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
function encodePng(size, pixel) {
  const bpr = size * 4;
  const raw = Buffer.alloc((bpr + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (bpr + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x, y);
      const o = y * (bpr + 1) + 1 + x * 4;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

const ACCENT = [59, 130, 246];
const ACCENT_DK = [37, 99, 235];
const WHITE = [255, 255, 255];

function makeIcon(size) {
  const bw = size * 0.15, gap = size * 0.075;
  const totalW = 3 * bw + 2 * gap, startX = (size - totalW) / 2, baseline = size * 0.74;
  const heights = [0.26, 0.4, 0.54].map((h) => h * size), radius = bw * 0.28;
  function inBar(x, y, bx, top) {
    if (x < bx || x > bx + bw || y < top || y > baseline) return false;
    const rx = Math.min(x - bx, bx + bw - x);
    if (y < top + radius && rx < radius) {
      const dx = radius - rx, dy = radius - (y - top);
      if (dx * dx + dy * dy > radius * radius) return false;
    }
    return true;
  }
  return (x, y) => {
    const t = y / size;
    const base = [
      Math.round(ACCENT[0] + (ACCENT_DK[0] - ACCENT[0]) * t),
      Math.round(ACCENT[1] + (ACCENT_DK[1] - ACCENT[1]) * t),
      Math.round(ACCENT[2] + (ACCENT_DK[2] - ACCENT[2]) * t),
    ];
    for (let i = 0; i < 3; i++) {
      const bx = startX + i * (bw + gap);
      if (inBar(x, y, bx, baseline - heights[i])) return [WHITE[0], WHITE[1], WHITE[2], 255];
    }
    return [base[0], base[1], base[2], 255];
  };
}

const out = path.join(__dirname, "SpendTrack", "Assets.xcassets", "AppIcon.appiconset", "icon-1024.png");
fs.writeFileSync(out, encodePng(1024, makeIcon(1024)));
console.log("wrote", out);
