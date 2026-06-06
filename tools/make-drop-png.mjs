// Erzeugt ein PNG mit einem Wassertropfen (transparenter Hintergrund) für die
// Shelly-Wall-Display-Kachel. Ohne externe Abhängigkeiten – reines Node + zlib.
//
// Aufruf: node tools/make-drop-png.mjs public/drop.png

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { deflateSync } from "node:zlib";

const SIZE = 96;
const apexY = 12;     // Spitze oben
const cx = 48;        // Mitte x
const cyc = 60;       // Kreismittelpunkt y
const R = 26;         // Kreisradius

// Tropfen-Farbe (hell-blau) und ein dezenter weißer Glanzpunkt.
const DROP = [79, 195, 247];      // #4FC3F7
const HILITE = [255, 255, 255];

function coverage(px, py) {
  // 4x Supersampling für weiche Kanten.
  let inside = 0;
  for (let sy = 0; sy < 2; sy++) {
    for (let sx = 0; sx < 2; sx++) {
      const x = px + (sx + 0.5) / 2;
      const y = py + (sy + 0.5) / 2;
      if (inDrop(x, y)) inside++;
    }
  }
  return inside / 4;
}

function inDrop(x, y) {
  const dx = x - cx;
  if (y >= cyc) {
    const dy = y - cyc;
    return dx * dx + dy * dy <= R * R;
  }
  // Oberer Teil: lineare Verjüngung von der Spitze zum Kreis (Tropfenform).
  if (y < apexY) return false;
  const w = (R * (y - apexY)) / (cyc - apexY);
  return Math.abs(dx) <= w;
}

function hiliteCoverage(x, y) {
  // Kleine Ellipse als Glanzlicht oben links im Tropfen.
  const ex = (x - 40) / 8;
  const ey = (y - 48) / 12;
  return ex * ex + ey * ey <= 1 ? 0.5 : 0;
}

// RGBA-Bild aufbauen, scanlines mit Filter-Byte 0.
const raw = Buffer.alloc((SIZE * 4 + 1) * SIZE);
let p = 0;
for (let y = 0; y < SIZE; y++) {
  raw[p++] = 0; // Filter: none
  for (let x = 0; x < SIZE; x++) {
    const a = coverage(x, y);
    let r = DROP[0], g = DROP[1], b = DROP[2];
    if (a > 0) {
      const h = hiliteCoverage(x, y);
      if (h > 0) {
        r = Math.round(r + (HILITE[0] - r) * h);
        g = Math.round(g + (HILITE[1] - g) * h);
        b = Math.round(b + (HILITE[2] - b) * h);
      }
    }
    raw[p++] = r;
    raw[p++] = g;
    raw[p++] = b;
    raw[p++] = Math.round(a * 255);
  }
}

// --- PNG-Encoder ---
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8;  // bit depth
ihdr[9] = 6;  // color type RGBA
ihdr[10] = 0; // compression
ihdr[11] = 0; // filter
ihdr[12] = 0; // interlace

const png = Buffer.concat([
  sig,
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);

const out = process.argv[2] || "public/drop.png";
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, png);
console.log("Geschrieben:", out, png.length, "bytes");
