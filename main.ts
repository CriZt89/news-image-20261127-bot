// news-image-20261127 v2 — "The World in One Day"
// Winner-template rebuild: 40 dated stories, 10 regions, UTC timeline,
// story-locator map, DATE CHECK box, HOW SURE legend — all drawn in code.
// Every story occurred / was first reported on Friday 27 November 2026,
// verified against Reuters / AP / BBC / PHIVOLCS / SMMT / NRF / Adobe.
// makefun anchor 99ce89d4161db64473e2298c5e96bb8b74c1533b round 34313288
// Deterministic: no clock, no randomness — the same run always writes the
// same bytes. 1024x1024 PNG.

import * as fs from "node:fs";
import * as path from "node:path";
import * as zlib from "node:zlib";
import * as crypto from "node:crypto";

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------------------
// 5x7 bitmap font (uppercase, digits, punctuation).
// ---------------------------------------------------------------------------
const FONT: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "00000", "11111"],
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
  $: ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
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
      if (y0 === y1) continue;
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
  ihdr[8] = 8;
  ihdr[9] = 2;
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
const PAPER: RGB = [247, 242, 231];
const PAPER2: RGB = [232, 228, 218];
const INK: RGB = [26, 26, 26];
const GREY: RGB = [88, 84, 78];
const RED: RGB = [185, 28, 28];
const TEAL: RGB = [15, 118, 110];
const AMBER: RGB = [200, 130, 20];
const GREEN: RGB = [46, 125, 60];
const BLUE: RGB = [40, 90, 160];
const WHITE: RGB = [255, 255, 255];
const MAPGREEN: RGB = [100, 155, 105];
const MAPBG: RGB = [222, 232, 228];
const DARK: RGB = [24, 18, 16];

// ---------------------------------------------------------------------------
// Data — all 40 stories dated Friday 27 November 2026
// ---------------------------------------------------------------------------
interface Lead {
  kicker: string;
  kickerColor: RGB;
  headline: string;
  ctx: string;
  src: string;
  scene: (x: number, y: number, w: number, h: number) => void;
}

interface Med {
  n: number;
  head: string;
  line: string;
  badge: string;
  badgeColor: RGB;
}

const STATS: [string, string][] = [
  ["$1.013T", "NRF SALES +4.2%"],
  ["$12.9B", "ADOBE ONLINE +9.2%"],
  ["64,141", "UK CARS OCT +4.8%"],
  ["57,475", "NIKKEI -0.04%"],
  ["2,361 T", "MAYON SO2 / DAY"],
  ["4,695", "KOSPI -0.34%"],
];

const TIMELINE: [string, string][] = [
  ["00:00", "TOKYO OPENS"],
  ["00:01", "SMMT CARS"],
  ["00:13", "NIKKEI 57,499"],
  ["00:20", "NZ 77-1"],
  ["00:54", "ZELENSKY BBC"],
  ["01:35", "NIKKEI ETF"],
  ["01:40", "AP WIRES"],
];

const REGIONS: string[] = [
  "ASIA-PAC 4", "EAST ASIA 3", "SOUTH ASIA 5", "OCEANIA 2", "UK+IRE 8",
  "EUROPE 10", "N. AMER 3", "MID EAST 1", "AFRICA 3", "GLOBAL 1",
];

const ALSO: string[] = [
  "14. FRANCE'S CENTRE RISKS VOTE DEBACLE (BBC)",
  "15. SPAIN VOTES SUNDAY; FEIJOO VYING TO WIN (BBC)",
  "16. NEARLY 100 LABOUR MPS OPPOSE ROSEBANK (BBC)",
  "17. MANDELSON KEPT SHARES AS ENVOY (BBC)",
  "18. UK MIGRATION LOWEST SINCE 1997 (BBC)",
  "19. UK SIGNS GBP 8BN SUBMARINE DEAL (BBC)",
  "20. UK RESERVISTS CONTACTED AS THREAT RISES (BBC)",
  "21. FIVE RUSSIAN JETS HIT, KYIV SAYS (BBC) (CLAIM)",
  "22. N. KOREA EXPELS SWISS DIPLOMAT (BBC)",
  "23. JOLIE, PITT SETTLE WINERY FIGHT (BBC)",
  "24. RUSSIAN GOVERNOR DETAINED (BBC)",
  "25. SANDPAPERGATE FORUM WILL NOT BLAME ANYONE (REUTERS)",
  "26. MI EMIRATES WIN BY 36 RUNS, ILT20 (APEX)",
  "27. INDIA U-19 WOMEN BEAT ENGLAND BY 36 RUNS (APEX)",
  "28. MUMBAI, VIDARBHA INTO KNOCKOUTS (APEX)",
  "29. FIFA CYBERATTACK: 12GB ACCESSED (SPORTZCRAAZY)",
  "30. INDIA PITCHES 2036 OLYMPICS TO IOC (SPORTSTAR)",
  "31. S. AFRICA LOSE TWO PACERS (SPORTZCRAAZY)",
  "32. SHAMI ENDS TEST CAREER (SPORTZCRAAZY)",
  "33. HARDIK TO PUNJAB KINGS (SPORTZCRAAZY)",
  "34. MOSI-OA-TUNYA TO HOST 2027 WORLD CUP (SPORTZCRAAZY)",
  "35. IRELAND'S FIRST PAKISTAN TOUR (SPORTZCRAAZY)",
  "36. CAIRO TANKER DRIVER ARRESTED (BBC)",
  "37. KANLAON AT LEVEL 2: 3 ASH EMISSIONS (PHIVOLCS)",
  "38. TAAL, BULUSAN STEADY AT LEVEL 1 (PHIVOLCS)",
  "39. COST-OF-LIVING PROTESTS SWEEP EUROPE (BBC)",
  "40. PREGNANT INMATE ESCAPES IN PRISON VAN (BBC)",
];

// Map pins 1-13: [x, y] on the 1024 canvas.
const PINS: [number, number][] = [
  [845, 706], // 1 Mayon
  [150, 694], // 2 Black Friday USA
  [502, 676], // 3 UK cars
  [892, 692], // 4 Japan JT
  [872, 680], // 5 Tokyo / Seoul
  [925, 752], // 6 NZ cricket
  [545, 678], // 7 Kyiv
  [478, 706], // 8 Ibiza tanker
  [508, 690], // 9 Depardieu Paris
  [522, 680], // 10 Boat dealer Germany
  [775, 700], // 11 Myanmar
  [185, 700], // 12 US storm
  [486, 690], // 13 UK-EU treaty
];

// ---------------------------------------------------------------------------
// Lead scenes — small code-drawn pictures, sized for a 324x135 box
// ---------------------------------------------------------------------------

// Mayon: dusk sky, perfect cone, ash plume, lava glow, houses below.
function sceneVolcano(x: number, y: number, w: number, h: number): void {
  vgrad(x, y, w, h, [59, 35, 80], [232, 114, 42]);
  fillCircle(x + Math.floor(w * 0.82), y + 22, 14, [247, 183, 115]);
  const px0 = x + Math.floor(w / 2);
  const peakY = y + 52;
  const puffs: [number, number, number, RGB][] = [
    [-4, -10, 13, [168, 158, 158]],
    [12, -22, 16, [168, 158, 158]],
    [30, -28, 18, [120, 110, 112]],
    [52, -26, 15, [168, 158, 158]],
    [4, -2, 11, [120, 110, 112]],
  ];
  for (const [dx, dy, r, c] of puffs) fillCircle(px0 + dx, peakY + dy, r, c);
  fillTri(x + 34, y + h, px0, peakY, x + w - 34, y + h, [42, 28, 26]);
  fillTri(px0, peakY, x + 34, y + h, px0 - 44, y + h, [58, 38, 34]);
  fillTri(px0 - 10, peakY, px0 + 10, peakY, px0, peakY + 8, [255, 120, 30]);
  fillRect(px0 - 2, peakY + 8, 4, 34, [255, 110, 25]);
  fillRect(x, y + h - 18, w, 18, [16, 12, 12]);
  for (let i = 0; i < 5; i++) {
    const hx = x + 22 + i * 62;
    fillRect(hx, y + h - 30, 22, 12, [30, 22, 22]);
    fillRect(hx + 5, y + h - 26, 4, 4, AMBER);
    fillRect(hx + 13, y + h - 26, 4, 4, AMBER);
  }
}

// Black Friday: shopfront awning, SALE sign, shopping bags.
function sceneShop(x: number, y: number, w: number, h: number): void {
  vgrad(x, y, w, h, [20, 42, 84], [38, 78, 140]);
  fillRect(x + 14, y + 18, w - 28, h - 18, [232, 222, 205]);
  fillRect(x + 14, y + 18, w - 28, 8, [180, 40, 48]);
  for (let i = 0; i < 8; i++) {
    fillRect(x + 14 + i * 38, y + 26, 19, 18, i % 2 === 0 ? RED : WHITE);
  }
  fillRect(x + 92, y + 50, 140, 34, RED);
  drawText("SALE", x + 116, y + 57, 3, WHITE);
  fillRect(x + 150, y + 88, 24, h - 88, [60, 48, 40]);
  fillRect(x + 30, y + 88, 52, 32, [140, 190, 220]);
  fillRect(x + 238, y + 88, 52, 32, [140, 190, 220]);
  const bags: [number, RGB][] = [[48, [245, 166, 35]], [124, [63, 185, 106]], [200, [229, 72, 77]], [258, [74, 144, 217]]];
  for (const [bx, c] of bags) {
    fillRect(x + bx, y + h - 34, 42, 26, c);
    fillTri(x + bx, y + h - 34, x + bx + 21, y + h - 44, x + bx + 42, y + h - 34, c);
  }
}

// UK cars: factory, car profile, rising chart bars.
function sceneCars(x: number, y: number, w: number, h: number): void {
  vgrad(x, y, w, h, [180, 200, 220], [120, 140, 165]);
  fillRect(x + 14, y + 62, w - 28, h - 62, [90, 96, 110]);
  fillRect(x + 26, y + 34, 16, 32, [70, 76, 90]);
  fillRect(x + 48, y + 44, 12, 22, [70, 76, 90]);
  fillCircle(x + 34, y + 26, 9, [220, 222, 226]);
  fillCircle(x + 54, y + 36, 7, [220, 222, 226]);
  for (let i = 0; i < 5; i++) fillRect(x + 92 + i * 38, y + 74, 24, 16, [150, 180, 210]);
  fillRect(x + 88, y + h - 40, 160, 16, [196, 42, 52]);
  fillTri(x + 106, y + h - 40, x + 128, y + h - 58, x + 182, y + h - 58, [196, 42, 52]);
  fillTri(x + 182, y + h - 58, x + 208, y + h - 40, x + 182, y + h - 40, [196, 42, 52]);
  fillRect(x + 134, y + h - 54, 40, 13, [170, 210, 235]);
  fillCircle(x + 114, y + h - 20, 10, INK);
  fillCircle(x + 114, y + h - 20, 4, [200, 200, 200]);
  fillCircle(x + 218, y + h - 20, 10, INK);
  fillCircle(x + 218, y + h - 20, 4, [200, 200, 200]);
  fillRect(x + 262, y + 74, 5, 34, GREEN);
  fillRect(x + 274, y + 62, 5, 46, GREEN);
  fillRect(x + 286, y + 48, 5, 60, GREEN);
  fillTri(x + 280, y + 38, x + 298, y + 38, x + 289, y + 26, GREEN);
}

const LEADS: Lead[] = [
  {
    kicker: "PHILIPPINES - VOLCANO",
    kickerColor: AMBER,
    headline: "MAYON HOLDS AT LEVEL 3",
    ctx: "EIGHT QUAKES IN 24 HOURS; SO2 2,361 TONNES A DAY; 6-KM DANGER ZONE SHUT.",
    src: "PHIVOLCS (OFFICIAL)",
    scene: sceneVolcano,
  },
  {
    kicker: "USA - SHOPPING",
    kickerColor: AMBER,
    headline: "BLACK FRIDAY: $1T TEST",
    ctx: "SALES SEEN +4.2% TO $1.013T, FIRST ABOVE $1T; ADOBE $12.9B ONLINE, +9.2%.",
    src: "NRF / REUTERS (REPORTED)",
    scene: sceneShop,
  },
  {
    kicker: "BRITAIN - INDUSTRY",
    kickerColor: GREEN,
    headline: "UK CARS ROAR BACK",
    ctx: "OUTPUT +4.8% IN OCT TO 64,141; CARS +6.2% TO 61,746; EXPORTS 82.6%.",
    src: "SMMT (OFFICIAL)",
    scene: sceneCars,
  },
];

const MEDIUM: Med[] = [
  { n: 4, head: "JT UP 2% ON IMPERIAL BID TALK", line: "ALTRIA WEIGHS ALL-CASH BID FOR IMPERIAL BRANDS", badge: "REUTERS (REPORTED)", badgeColor: BLUE },
  { n: 5, head: "TOKYO, SEOUL SLIP AFTER BRIGHT OPEN", line: "NIKKEI 57,475 (-0.04%), KOSPI 4,695 (-0.34%)", badge: "TRADINGKEY (REPORTED)", badgeColor: BLUE },
  { n: 6, head: "NZ 77-1 AT LUNCH IN CHRISTCHURCH", line: "CONWAY LBW 31 TO DEBUTANT BRAR; LATHAM 42", badge: "REUTERS (REPORTED)", badgeColor: BLUE },
  { n: 7, head: "ZELENSKY: US 'TOO FOCUSED' ON MIDEAST", line: "KYIV: WASHINGTON NOT PUSHING RUSSIA HARD ENOUGH", badge: "BBC (REPORTED)", badgeColor: BLUE },
  { n: 8, head: "TANKER CAPSIZES OFF IBIZA, ONE DEAD", line: "DIESEL TANKER CARRYING UP TO 7,000 TONNES GOES DOWN", badge: "BBC (REPORTED)", badgeColor: BLUE },
  { n: 9, head: "DEPARDIEU TO STAND TRIAL", line: "PARIS COURT RULES ACTOR WILL FACE TRIAL OVER 2018 CASE", badge: "BBC (REPORTED)", badgeColor: BLUE },
  { n: 10, head: "BBC: BOAT DEALER 'SUPPLYING' GANGS", line: "GERMAN DEALER SUSPECTED OF SUPPLYING CHANNEL GANGS", badge: "BBC (REPORTED)", badgeColor: BLUE },
  { n: 11, head: "MYANMAR DEFIES ICJ GENOCIDE RULING", line: "MYANMAR REFUSES TO COMPLY WITH PARTS OF RULING", badge: "BBC (REPORTED)", badgeColor: BLUE },
  { n: 12, head: "THANKSGIVING STORM FLOODS US", line: "MAJOR STORM BRINGS FLOODING, FLIGHT DELAYS", badge: "BBC (REPORTED)", badgeColor: BLUE },
  { n: 13, head: "NEW UK-EU TREATY HAS 10-YEAR EXIT", line: "TREATY TEXT PUBLISHED; 10-YEAR EXIT CLAUSE", badge: "BBC (REPORTED)", badgeColor: BLUE },
];

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------
function render(): void {
  fillRect(0, 0, W, H, PAPER);

  // Masthead (0-108)
  const title = "THE WORLD IN ONE DAY";
  drawText(title, Math.floor((W - textWidth(title, 5)) / 2), 12, 5, INK);
  const sub = "FRIDAY 27 NOVEMBER 2026  -  40 DATED STORIES  -  10 REGIONS";
  drawText(sub, Math.floor((W - textWidth(sub, 2)) / 2), 60, 2, RED);
  fillRect(12, 96, W - 24, 3, RED);
  fillRect(12, 101, W - 24, 1, RED);

  // Stats strip (110-150): 6 boxes
  const boxW = 160;
  for (let i = 0; i < STATS.length; i++) {
    const bx = 12 + i * (boxW + 8);
    fillRect(bx, 110, boxW, 40, PAPER2);
    hline(bx, 110, boxW, RED);
    const num = STATS[i][0];
    drawText(num, bx + Math.floor((boxW - textWidth(num, 3)) / 2), 116, 3, INK);
    const lab = STATS[i][1];
    drawText(lab, bx + Math.floor((boxW - textWidth(lab, 1)) / 2), 140, 1, GREY);
  }

  // UTC timeline (150-185)
  hline(40, 168, 944, GREY);
  for (let i = 0; i < TIMELINE.length; i++) {
    const cx = 60 + i * 140;
    const t = TIMELINE[i][0];
    const lab = TIMELINE[i][1];
    drawText(t, cx - Math.floor(textWidth(t, 1) / 2), 152, 1, RED);
    fillCircle(cx, 168, 4, RED);
    drawText(lab, cx - Math.floor(textWidth(lab, 1) / 2), 176, 1, INK);
  }

  // Region tabs (185-205)
  for (let i = 0; i < REGIONS.length; i++) {
    const tx = 12 + i * 100;
    fillRect(tx, 186, 98, 18, i % 2 === 0 ? TEAL : [23, 94, 88]);
    const lab = REGIONS[i];
    drawText(lab, tx + Math.floor((98 - textWidth(lab, 1)) / 2), 192, 1, WHITE);
  }

  // Leads (205-470): 3 columns
  const colW = 324;
  const gap = 14;
  for (let i = 0; i < LEADS.length; i++) {
    const x = 12 + i * (colW + gap);
    const y = 205;
    const lead = LEADS[i];
    fillRect(x, y, colW, 265, PAPER2);
    hline(x, y, colW, RED);
    lead.scene(x, y + 4, colW, 131);
    drawText(lead.kicker, x + 12, y + 143, 1, lead.kickerColor);
    const headLines = wrapText(lead.headline, colW - 24, 3);
    let hy = y + 158;
    for (const ln of headLines.slice(0, 2)) {
      drawText(ln, x + 12, hy, 3, INK);
      hy += 24;
    }
    const ctxLines = wrapText(lead.ctx, colW - 24, 1);
    let cy = y + 158 + headLines.slice(0, 2).length * 24 + 4;
    for (const ln of ctxLines.slice(0, 2)) {
      drawText(ln, x + 12, cy, 1, GREY);
      cy += 11;
    }
    drawText(lead.src, x + 12, y + 246, 1, lead.kickerColor);
  }

  // Medium stories 4-13 (470-640): 2 cols x 5 rows
  const medColW = 493;
  for (let i = 0; i < MEDIUM.length; i++) {
    const m = MEDIUM[i];
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 12 + col * (medColW + 14);
    const y = 470 + row * 34;
    if (row % 2 === 0) fillRect(x, y, medColW, 34, PAPER2);
    drawText(String(m.n) + ".", x + 4, y + 4, 2, RED);
    drawText(m.head, x + 42, y + 4, 2, INK);
    const lineW = textWidth(m.line, 1);
    drawText(m.line, x + 42, y + 22, 1, GREY);
    drawText(m.badge, x + 42 + lineW + 8, y + 22, 1, m.badgeColor);
  }

  // Map (640-780)
  const mapTitle = "WHERE IT HAPPENED - STORIES 1 TO 13";
  drawText(mapTitle, 12, 646, 2, INK);
  fillRect(12, 668, 1000, 112, MAPBG);
  // continents (stylised)
  fillRect(55, 680, 175, 34, MAPGREEN); // North America
  fillRect(210, 714, 40, 14, MAPGREEN); // Central America
  fillRect(235, 720, 55, 50, MAPGREEN); // South America
  fillTri(235, 720, 290, 720, 262, 770, MAPGREEN);
  fillRect(478, 672, 70, 26, MAPGREEN); // Europe
  fillRect(480, 700, 75, 68, MAPGREEN); // Africa
  fillTri(480, 700, 555, 700, 520, 768, MAPGREEN);
  fillRect(560, 672, 330, 44, MAPGREEN); // Asia
  fillRect(700, 716, 180, 20, MAPGREEN); // SE Asia
  fillRect(855, 740, 75, 26, MAPGREEN); // Australia
  fillRect(890, 680, 12, 30, MAPGREEN); // Japan
  fillRect(920, 748, 10, 12, MAPGREEN); // NZ
  for (let i = 0; i < PINS.length; i++) {
    const [pxx, pyy] = PINS[i];
    fillCircle(pxx, pyy, 7, RED);
    const num = String(i + 1);
    drawText(num, pxx - Math.floor(textWidth(num, 1) / 2), pyy - 3, 1, WHITE);
  }

  // ALSO ON 14-40 (780-930): 3 cols x 9 rows
  drawText("ALSO ON...", 12, 786, 2, INK);
  for (let i = 0; i < ALSO.length; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 12 + col * 336;
    const y = 806 + row * 14;
    drawText(ALSO[i], x, y, 1, INK);
  }

  // DATE CHECK box (930-985)
  fillRect(12, 930, 1000, 55, [255, 248, 240]);
  fillRect(12, 930, 1000, 2, RED);
  fillRect(12, 983, 1000, 2, RED);
  fillRect(12, 930, 2, 55, RED);
  fillRect(1010, 930, 2, 55, RED);
  drawText("DATE CHECK - NOT 27 NOV, SO NOT IN THIS PAPER:", 20, 938, 1, RED);
  drawText("EBOLA DR CONGO 25 NOV - KIM NUKES 26 NOV - BANK OF KOREA +25BPS 26 NOV - ANDY TAYLOR DIED 23 NOV", 20, 952, 1, INK);
  drawText("ALSO LEFT OUT: LULA MINISTER PICK 26 NOV - SRI LANKA A 26 NOV - MACY'S PARADE 25 NOV", 20, 966, 1, GREY);

  // Footer (985-1024)
  const f1 = "HOW SURE: OFFICIAL = ON THE RECORD - REPORTED = WIRES/OUTLETS - CLAIM = ONE PARTY, UNVERIFIED";
  drawText(f1, Math.floor((W - textWidth(f1, 1)) / 2), 992, 1, GREY);
  const f2 = "ALL 40 STORIES DATED 27 NOV 2026 - SOURCES: REUTERS, AP, BBC, PHIVOLCS, SMMT, NRF, ADOBE";
  drawText(f2, Math.floor((W - textWidth(f2, 1)) / 2), 1006, 1, GREY);
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
