// news-image-20261127 — "The World in One Image"
// Sums up Friday 27 November 2026 in one 1024x1024 PNG, drawn entirely in code.
// Seven stories, every fact verified against Reuters / UN News / PHIVOLCS on 27 Nov 2026:
//  1. Black Friday (USA) — holiday sales seen +4.2% to just above $1 trillion (NRF, via Reuters, 27 Nov)
//  2. Mayon volcano (Philippines) — Alert Level 3 holds; PHIVOLCS 27 Nov bulletin: 8 quakes, SO2 2,361 t/day
//  3. Ebola (DR Congo) — 12,021 cases, 5,904 deaths; 2nd-largest outbreak on record (Reuters, 26 Nov)
//  4. Kim Jong Un (North Korea) — tactical nuclear weapons across domains, KCNA (reported 26 Nov)
//  5. Tankers off Oman — IRGC claims two hit mines near Khasab; claims unverified (Reuters, 26 Nov)
//  6. UK car output (Britain) — +4.8% in October to 64,141 vehicles, SMMT (Reuters, 27 Nov)
//  7. Serbia — presidential election set for 27 December after student protests swept parliament (Reuters, 26 Nov)
// Deterministic: no clock, no randomness — the same run always writes the same bytes.

import * as fs from "node:fs";
import * as path from "node:path";
import * as zlib from "node:zlib";
import * as crypto from "node:crypto";

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------------------
// 5x7 bitmap font (uppercase, digits, punctuation). Each glyph is 7 rows of
// 5 bits, written as strings so the shapes stay readable in the source.
// ---------------------------------------------------------------------------
const FONT: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  ";": ["00000", "01100", "01100", "00000", "01100", "00100", "01000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00010", "00100", "00000", "00100"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "=": ["00000", "00000", "11111", "00000", "11111", "00000", "00000"],
  "$": ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
  "•": ["00000", "00000", "01100", "01100", "01100", "00000", "00000"],
};

type RGB = [number, number, number];

// ---------------------------------------------------------------------------
// Framebuffer + raster helpers
// ---------------------------------------------------------------------------
const px = new Uint8Array(W * H * 3);

function setPx(x: number, y: number, c: RGB): void {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0];
  px[i + 1] = c[1];
  px[i + 2] = c[2];
}

function fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(W, Math.ceil(x + w));
  const y1 = Math.min(H, Math.ceil(y + h));
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) setPx(xx, yy, c);
  }
}

function fillCircle(cx: number, cy: number, r: number, c: RGB): void {
  for (let dy = -r; dy <= r; dy++) {
    const dx = Math.floor(Math.sqrt(r * r - dy * dy));
    fillRect(cx - dx, cy + dy, dx * 2 + 1, 1, c);
  }
}

function fillTri(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, c: RGB): void {
  const minY = Math.max(0, Math.floor(Math.min(ay, by, cy)));
  const maxY = Math.min(H - 1, Math.ceil(Math.max(ay, by, cy)));
  const edges: [number, number, number, number][] = [
    [ax, ay, bx, by],
    [bx, by, cx, cy],
    [cx, cy, ax, ay],
  ];
  for (let y = minY; y <= maxY; y++) {
    const xs: number[] = [];
    for (const [x0, y0, x1, y1] of edges) {
      if (y0 === y1) continue; // horizontal edge: no single intersection
      const lo = Math.min(y0, y1);
      const hi = Math.max(y0, y1);
      if (y < lo || y > hi) continue;
      xs.push(x0 + ((y - y0) * (x1 - x0)) / (y1 - y0));
    }
    if (xs.length < 2) continue;
    const x0 = Math.max(0, Math.floor(Math.min(...xs)));
    const x1 = Math.min(W - 1, Math.ceil(Math.max(...xs)));
    for (let x = x0; x <= x1; x++) setPx(x, y, c);
  }
}

function vgrad(x: number, y: number, w: number, h: number, top: RGB, bottom: RGB): void {
  for (let yy = 0; yy < h; yy++) {
    const t = h <= 1 ? 0 : yy / (h - 1);
    const c: RGB = [
      Math.round(top[0] + (bottom[0] - top[0]) * t),
      Math.round(top[1] + (bottom[1] - top[1]) * t),
      Math.round(top[2] + (bottom[2] - top[2]) * t),
    ];
    fillRect(x, y + yy, w, 1, c);
  }
}

function hline(x: number, y: number, w: number, c: RGB): void {
  fillRect(x, y, w, 1, c);
}

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------
function drawText(s: string, x: number, y: number, scale: number, c: RGB): void {
  let cx = x;
  for (const ch of s.toUpperCase()) {
    const g = FONT[ch] ?? FONT["?"];
    for (let r = 0; r < 7; r++) {
      for (let col = 0; col < 5; col++) {
        if (g[r][col] === "1") fillRect(cx + col * scale, y + r * scale, scale, scale, c);
      }
    }
    cx += 6 * scale;
  }
}

function textWidth(s: string, scale: number): number {
  return s.length === 0 ? 0 : s.length * 6 * scale - scale;
}

function wrapText(s: string, maxW: number, scale: number): string[] {
  const words = s.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur === "" ? w : cur + " " + w;
    if (textWidth(next, scale) <= maxW) {
      cur = next;
    } else {
      if (cur !== "") lines.push(cur);
      cur = w;
    }
  }
  if (cur !== "") lines.push(cur);
  return lines;
}

// ---------------------------------------------------------------------------
// PNG encoding (truecolour, filter 0, zlib level 9 — fully deterministic)
// ---------------------------------------------------------------------------
const CRC_TABLE: number[] = (() => {
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t.push(c >>> 0);
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePNG(): Buffer {
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------
const INK: RGB = [13, 21, 38];
const BAND: RGB = [16, 26, 46];
const WHITE: RGB = [255, 255, 255];
const SUB: RGB = [199, 211, 232];
const AMBER: RGB = [245, 166, 35];
const RED: RGB = [229, 72, 77];
const GREEN: RGB = [63, 185, 106];
const BLUE: RGB = [74, 144, 217];
const DARK: RGB = [24, 18, 16];

// ---------------------------------------------------------------------------
// Panel chrome: scene on top, dark label band below with kicker + headline + sub
// ---------------------------------------------------------------------------
interface PanelSpec {
  kicker: string;
  kickerColor: RGB;
  headline: string;
  sub: string[];
}

function drawPanel(
  x: number,
  y: number,
  w: number,
  h: number,
  sceneH: number,
  drawScene: (sx: number, sy: number, sw: number, sh: number) => void,
  spec: PanelSpec,
): void {
  fillRect(x, y, w, h, INK);
  drawScene(x, y, w, sceneH);
  const by = y + sceneH;
  fillRect(x, by, w, h - sceneH, BAND);
  hline(x, by, w, AMBER);
  drawText(spec.kicker, x + 12, by + 9, 1, spec.kickerColor);
  const headLines = wrapText(spec.headline, w - 24, 3);
  let hy = by + 24;
  for (const ln of headLines.slice(0, 2)) {
    drawText(ln, x + 12, hy, 3, WHITE);
    hy += 24;
  }
  let sy = by + 24 + headLines.slice(0, 2).length * 24 + 2;
  for (const ln of spec.sub.slice(0, 2)) {
    drawText(ln, x + 12, sy, 2, SUB);
    sy += 15;
  }
}

// ---------------------------------------------------------------------------
// Scenes — one small code-drawn picture per story
// ---------------------------------------------------------------------------

// Hero: Mount Mayon at dusk — perfect cone, ash plume drifting, lava glow.
function sceneMayon(x: number, y: number, w: number, h: number): void {
  vgrad(x, y, w, h, [59, 35, 80], [232, 114, 42]);
  fillCircle(x + Math.floor(w * 0.82), y + 42, 26, [247, 183, 115]);
  fillCircle(x + Math.floor(w * 0.82), y + 42, 18, [252, 214, 150]);
  // ash plume rising from the crater, drifting right
  const plume: RGB = [168, 158, 158];
  const plumeDark: RGB = [120, 110, 112];
  const px0 = x + Math.floor(w / 2);
  const peakY = y + 64;
  const puffs: [number, number, number, RGB][] = [
    [-4, -18, 26, plume], [20, -40, 32, plume], [52, -54, 36, plumeDark],
    [88, -58, 32, plume], [122, -50, 26, plumeDark], [150, -34, 20, plume],
    [6, -4, 20, plumeDark], [36, -20, 24, plume],
  ];
  for (const [dx, dy, r, c] of puffs) fillCircle(px0 + dx, peakY + dy, r, c);
  // the cone — steep, pointed, Mayon's near-perfect cone
  fillTri(x + 270, y + h, px0, peakY, x + w - 270, y + h, [42, 28, 26]);
  fillTri(px0, peakY, x + 270, y + h, px0 - 70, y + h, [58, 38, 34]);
  // lava glow at the crater + rivulets down the slope
  fillTri(px0 - 18, peakY, px0 + 18, peakY, px0, peakY + 14, [255, 120, 30]);
  fillRect(px0 - 3, peakY + 14, 6, 74, [255, 110, 25]);
  fillRect(px0 + 24, peakY + 30, 4, 46, [230, 90, 20]);
  // foreground ground + tiny houses with lit windows
  fillRect(x, y + h - 34, w, 34, [16, 12, 12]);
  for (let i = 0; i < 9; i++) {
    const hx = x + 30 + i * 106;
    fillRect(hx, y + h - 58, 34, 24, [30, 22, 22]);
    fillTri(hx - 2, y + h - 58, hx + 17, y + h - 70, hx + 36, y + h - 58, [44, 30, 30]);
    fillRect(hx + 8, y + h - 50, 6, 6, AMBER);
    fillRect(hx + 20, y + h - 50, 6, 6, AMBER);
  }
}

// Black Friday: shopfront awning, SALE sign, shopping bags.
function sceneBlackFriday(x: number, y: number, w: number, h: number): void {
  vgrad(x, y, w, h, [20, 42, 84], [38, 78, 140]);
  // shopfront
  fillRect(x + 18, y + 26, w - 36, h - 26, [232, 222, 205]);
  fillRect(x + 18, y + 26, w - 36, 10, [180, 40, 48]);
  for (let i = 0; i < 8; i++) {
    fillRect(x + 18 + i * 38, y + 36, 19, 22, i % 2 === 0 ? RED : WHITE);
  }
  // SALE sign
  fillRect(x + 96, y + 66, 132, 40, RED);
  drawText("SALE", x + 112, y + 74, 3, WHITE);
  // door + window
  fillRect(x + 150, y + 112, 26, 56, [60, 48, 40]);
  fillRect(x + 34, y + 112, 56, 40, [140, 190, 220]);
  fillRect(x + 232, y + 112, 56, 40, [140, 190, 220]);
  // shopping bags
  const bags: [number, RGB][] = [[52, [245, 166, 35]], [128, [63, 185, 106]], [204, [229, 72, 77]], [262, [74, 144, 217]]];
  for (const [bx, c] of bags) {
    fillRect(x + bx, y + h - 46, 44, 34, c);
    fillTri(x + bx, y + h - 46, x + bx + 22, y + h - 58, x + bx + 44, y + h - 46, c);
    fillRect(x + bx + 14, y + h - 56, 16, 4, INK);
  }
}

// Ebola: clinic tent, red cross, PPE figures.
function sceneEbola(x: number, y: number, w: number, h: number): void {
  vgrad(x, y, w, h, [214, 196, 168], [178, 150, 120]);
  fillRect(x, y + h - 26, w, 26, [120, 96, 66]);
  // tent
  fillTri(x + 52, y + h - 26, x + 162, y + 34, x + 272, y + h - 26, [245, 242, 235]);
  fillTri(x + 162, y + 34, x + 162, y + 58, x + 118, y + h - 26, [225, 220, 210]);
  // red cross on the tent
  fillRect(x + 150, y + 74, 24, 10, RED);
  fillRect(x + 157, y + 67, 10, 24, RED);
  // figures in PPE
  const figs: [number, RGB][] = [[36, [240, 240, 235]], [252, [200, 220, 240]], [288, [240, 240, 235]]];
  for (const [fx, c] of figs) {
    fillCircle(x + fx, y + h - 62, 9, c);
    fillRect(x + fx - 9, y + h - 52, 18, 28, c);
  }
  // biohazard dots drifting
  fillCircle(x + 60, y + 30, 4, RED);
  fillCircle(x + 280, y + 44, 4, RED);
  fillCircle(x + 250, y + 18, 3, RED);
}

// Kim: night sky, missile on a launcher, red star.
function sceneKim(x: number, y: number, w: number, h: number): void {
  vgrad(x, y, w, h, [10, 14, 30], [34, 44, 84]);
  const stars: [number, number][] = [[30, 22], [90, 40], [150, 18], [210, 34], [260, 20], [300, 48], [60, 62], [190, 60]];
  for (const [sx, sy] of stars) fillRect(x + sx, y + sy, 3, 3, WHITE);
  // red star badge (white 4-point star on a red disc)
  fillCircle(x + 268, y + 78, 16, RED);
  fillTri(x + 268, y + 66, x + 272, y + 78, x + 268, y + 90, WHITE);
  fillTri(x + 268, y + 66, x + 264, y + 78, x + 268, y + 90, WHITE);
  fillTri(x + 256, y + 78, x + 268, y + 74, x + 280, y + 78, WHITE);
  fillTri(x + 256, y + 78, x + 268, y + 82, x + 280, y + 78, WHITE);
  // launcher + missile, diagonal
  fillRect(x + 40, y + h - 40, 220, 12, [70, 76, 88]);
  fillRect(x + 52, y + h - 52, 16, 14, [50, 54, 64]);
  fillRect(x + 228, y + h - 52, 16, 14, [50, 54, 64]);
  fillTri(x + 96, y + h - 46, x + 236, y + 44, x + 252, y + 56, [200, 205, 212]);
  fillTri(x + 236, y + 44, x + 252, y + 56, x + 236, y + 62, [160, 165, 175]);
  fillCircle(x + 244, y + 50, 6, RED);
  // exhaust flame
  fillTri(x + 88, y + h - 46, x + 108, y + h - 46, x + 98, y + h - 22, [255, 166, 35]);
  fillTri(x + 92, y + h - 46, x + 104, y + h - 46, x + 98, y + h - 30, [255, 220, 120]);
}

// Tankers: sea, burning tanker, smoke.
function sceneTankers(x: number, y: number, w: number, h: number): void {
  vgrad(x, y, w, h, [232, 150, 80], [24, 52, 96]);
  fillCircle(x + 262, y + 34, 20, [252, 214, 150]);
  // sea
  fillRect(x, y + 96, w, h - 96, [16, 44, 84]);
  for (let i = 0; i < 6; i++) hline(x + 12 + i * 52, y + 116 + (i % 3) * 14, 34, [90, 140, 190]);
  // tanker hull + bridge
  fillRect(x + 34, y + 84, 240, 26, [40, 44, 52]);
  fillRect(x + 226, y + 52, 40, 34, [220, 224, 228]);
  fillRect(x + 232, y + 58, 10, 8, [30, 60, 100]);
  fillRect(x + 250, y + 58, 10, 8, [30, 60, 100]);
  // flames
  const flames: [number, number, number][] = [[90, 84, 26], [130, 84, 34], [176, 84, 28], [210, 84, 20]];
  for (const [fx, fy, fr] of flames) {
    fillTri(x + fx - fr, y + fy, x + fx, y + fy - fr - 18, x + fx + fr, y + fy, [255, 120, 30]);
    fillTri(x + fx - fr / 2, y + fy, x + fx, y + fy - fr, x + fx + fr / 2, y + fy, [255, 210, 90]);
  }
  // smoke
  fillCircle(x + 130, y + 30, 18, [70, 66, 66]);
  fillCircle(x + 168, y + 18, 22, [90, 86, 86]);
  fillCircle(x + 208, y + 28, 16, [70, 66, 66]);
}

// UK cars: factory, car profile, rising chart arrow.
function sceneUKCars(x: number, y: number, w: number, h: number): void {
  vgrad(x, y, w, h, [180, 200, 220], [120, 140, 165]);
  // factory
  fillRect(x + 16, y + 78, w - 32, h - 78, [90, 96, 110]);
  fillRect(x + 30, y + 44, 18, 40, [70, 76, 90]);
  fillRect(x + 56, y + 56, 14, 28, [70, 76, 90]);
  fillCircle(x + 39, y + 34, 10, [220, 222, 226]);
  fillCircle(x + 63, y + 46, 8, [220, 222, 226]);
  for (let i = 0; i < 5; i++) fillRect(x + 96 + i * 40, y + 92, 26, 20, [150, 180, 210]);
  // car profile
  fillRect(x + 96, y + h - 52, 168, 20, [196, 42, 52]);
  fillTri(x + 116, y + h - 52, x + 140, y + h - 74, x + 196, y + h - 74, [196, 42, 52]);
  fillTri(x + 196, y + h - 74, x + 224, y + h - 52, x + 196, y + h - 52, [196, 42, 52]);
  fillRect(x + 146, y + h - 70, 44, 16, [170, 210, 235]);
  fillCircle(x + 126, y + h - 28, 12, INK);
  fillCircle(x + 126, y + h - 28, 5, [200, 200, 200]);
  fillCircle(x + 232, y + h - 28, 12, INK);
  fillCircle(x + 232, y + h - 28, 5, [200, 200, 200]);
  // rising arrow
  fillRect(x + 262, y + 96, 6, 44, GREEN);
  fillRect(x + 276, y + 82, 6, 58, GREEN);
  fillRect(x + 290, y + 66, 6, 74, GREEN);
  fillTri(x + 284, y + 52, x + 304, y + 52, x + 294, y + 36, GREEN);
}

// Serbia: tricolour backdrop, ballot box, crowd.
function sceneSerbia(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, 56, [198, 54, 60]);
  fillRect(x, y + 56, w, 56, [28, 68, 142]);
  fillRect(x, y + 112, w, h - 112, [240, 240, 240]);
  // ballot box
  fillRect(x + 118, y + 66, 88, 66, [250, 250, 250]);
  fillRect(x + 118, y + 66, 88, 8, [40, 44, 52]);
  fillRect(x + 148, y + 62, 28, 6, INK);
  drawText("VOTE", x + 138, y + 92, 2, INK);
  // ballot slip going in
  fillRect(x + 150, y + 40, 24, 26, WHITE);
  // crowd heads
  for (let i = 0; i < 8; i++) {
    const cx = x + 24 + i * 38;
    fillCircle(cx, y + h - 22, 10, i % 2 === 0 ? [60, 48, 40] : [90, 70, 55]);
    fillRect(cx - 12, y + h - 12, 24, 12, i % 2 === 0 ? [198, 54, 60] : [28, 68, 142]);
  }
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------
function render(): void {
  fillRect(0, 0, W, H, INK);

  // Masthead
  drawText("THE WORLD IN ONE IMAGE", 12, 14, 5, WHITE);
  drawText("FRIDAY 27 NOVEMBER 2026  •  SEVEN STORIES THAT SHAPED THE DAY", 14, 62, 2, AMBER);
  fillRect(12, 100, W - 24, 4, AMBER);

  // Hero: Mayon
  const heroX = 12;
  const heroY = 116;
  const heroW = W - 24;
  const heroH = 308;
  const heroSceneH = 224;
  drawPanel(heroX, heroY, heroW, heroH, heroSceneH, sceneMayon, {
    kicker: "PHILIPPINES  •  VOLCANO",
    kickerColor: AMBER,
    headline: "MAYON STAYS ON ALERT",
    sub: [
      "Alert Level 3 holds: 8 quakes, 2,361 tonnes of gas a day;",
      "the 6-km danger zone stays shut",
    ],
  });

  // Grid: 3 columns x 2 rows
  const colW = 324;
  const gap = 14;
  const rowH = 272;
  const gridY = 438;
  const panels: { scene: (x: number, y: number, w: number, h: number) => void; spec: PanelSpec }[] = [
    {
      scene: sceneBlackFriday,
      spec: {
        kicker: "USA  •  SHOPPING",
        kickerColor: AMBER,
        headline: "BLACK FRIDAY RUSH",
        sub: ["Shoppers out as storm", "clears; sales +4.2% to $1T"],
      },
    },
    {
      scene: sceneEbola,
      spec: {
        kicker: "DR CONGO  •  HEALTH",
        kickerColor: RED,
        headline: "EBOLA PASSES 12,000",
        sub: ["12,021 cases, 5,904 dead", "in DR Congo; war blocks aid"],
      },
    },
    {
      scene: sceneKim,
      spec: {
        kicker: "NORTH KOREA  •  SECURITY",
        kickerColor: RED,
        headline: "KIM WIDENS ARSENAL",
        sub: ["Tactical nukes to spread", "across domains, KCNA says"],
      },
    },
    {
      scene: sceneTankers,
      spec: {
        kicker: "STRAIT OF HORMUZ  •  ENERGY",
        kickerColor: AMBER,
        headline: "TANKERS ABLAZE",
        sub: ["IRGC claims two hit mines", "near Khasab; unverified"],
      },
    },
    {
      scene: sceneUKCars,
      spec: {
        kicker: "BRITAIN  •  INDUSTRY",
        kickerColor: GREEN,
        headline: "UK CARS REBOUND",
        sub: ["+4.8% in Oct to 64,141", "cars as JLR recovers"],
      },
    },
    {
      scene: sceneSerbia,
      spec: {
        kicker: "SERBIA  •  POLITICS",
        kickerColor: BLUE,
        headline: "SERBIA VOTES DEC 27",
        sub: ["Student protests swept", "parliament in October"],
      },
    },
  ];
  panels.forEach((p, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 12 + col * (colW + gap);
    const y = gridY + row * (rowH + gap);
    drawPanel(x, y, colW, rowH, 168, p.scene, p.spec);
  });

  // Footer: sources
  const foot = "SOURCES: REUTERS  •  UN NEWS  •  KCNA  •  PHIVOLCS  •  SMMT";
  drawText(foot, Math.floor((W - textWidth(foot, 2)) / 2), 1004, 2, SUB);
}

function main(): void {
  const argOut = process.argv[2];
  const outPath = argOut ?? (fs.existsSync("/output") ? "/output/entry.png" : path.join("out", "entry.png"));
  render();
  const png = encodePNG();
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, png);
  const hash = crypto.createHash("sha256").update(png).digest("hex");
  console.log(`wrote ${outPath} ${png.length} bytes sha256=${hash} ${W}x${H}`);
}

main();
