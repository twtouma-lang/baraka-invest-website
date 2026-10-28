'use strict';
// Baraka Invest investor film: deterministic frame engine. renderFrame(f) draws frame f of 1536 (64 s @ 24 fps).
const W = 1920, H = 1080, FPS = 24, DUR = 64, NF = FPS * DUR;

// ---------- math ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, u) => a + (b - a) * u;
const inv = (a, b, x) => clamp((x - a) / (b - a));
const smooth = u => u * u * (3 - 2 * u);
const eio = u => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const eo3 = u => 1 - Math.pow(1 - u, 3);
const eo5 = u => 1 - Math.pow(1 - u, 5);
const eoX = u => (u >= 1 ? 1 : 1 - Math.pow(2, -10 * u));
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash1(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, seed) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(hash1(i + seed * 101.3), hash1(i + 1 + seed * 101.3), u) * 2 - 1;
}
const BEAT = 0.4644, PHASE = 0.430;
function sinceBeat(t) { const k = Math.floor((t - PHASE) / BEAT); return t - (PHASE + k * BEAT); }

// ---------- canvases ----------
function mk(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  return [c, g];
}
const OUT = document.getElementById('c');
const ox = OUT.getContext('2d'); ox.imageSmoothingQuality = 'high';
const [MAIN, mx] = mk(W, H), [SMP, sx] = mk(W, H);
const [X1, x1] = mk(W, H), [X2, x2] = mk(W, H), [X3, x3] = mk(W, H);
const [B1, b1x] = mk(480, 270), [B2, b2x] = mk(240, 135);

// ---------- assets ----------
const NAMES = ['s01_earth', 's02_gulf_dusk', 's03_europe', 's04_asia', 's05_port', 's06_solar', 's07_noise',
  's08_tower', 's09_library', 's10_desk', 's11_lattice', 's12_investor', 's13_sunrise'];
const IM = {}, BL = {}, GL = {}, GRAIN = [];
let VIG = null, NAVY = null;
const LOGO = { strokes: [] };
const TICK = [];

function blurred(im, w, h, px, extra) {
  const m = Math.ceil(px * 3);
  const [c, g] = mk(w + 2 * m, h + 2 * m);
  g.drawImage(im, 0, 0, w + 2 * m, h + 2 * m);
  g.drawImage(im, m, m, w, h);
  const [c3, g3] = mk(w + 2 * m, h + 2 * m);
  g3.filter = `blur(${px}px)` + (extra ? ' ' + extra : '');
  g3.drawImage(c, 0, 0);
  const [c2, g2] = mk(w, h);
  g2.drawImage(c3, m, m, w, h, 0, 0, w, h);
  return c2;
}
function glowSprite(r, g, b, size = 256, fall = 2.2) {
  const [c, x] = mk(size, size);
  const gr = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (let i = 0; i <= 12; i++) { const u = i / 12; gr.addColorStop(u, `rgba(${r},${g},${b},${Math.pow(1 - u, fall).toFixed(4)})`); }
  x.fillStyle = gr; x.fillRect(0, 0, size, size);
  return c;
}
function buildGrain() {
  for (let k = 0; k < 3; k++) {
    const [c, g] = mk(W + 128, H + 128);
    const id = g.createImageData(c.width, c.height), d = id.data, r = rng(1000 + k);
    for (let i = 0; i < d.length; i += 4) {
      const v = 128 + (r() + r() + r() - 1.5) * 120;
      const q = v < 0 ? 0 : v > 255 ? 255 : v;
      d[i] = d[i + 1] = d[i + 2] = q; d[i + 3] = 255;
    }
    g.putImageData(id, 0, 0);
    const [c2, g2] = mk(c.width, c.height);
    g2.filter = 'blur(0.55px)'; g2.drawImage(c, 0, 0);
    GRAIN.push(c2);
  }
}
function buildVignette() {
  const [c, g] = mk(W, H);
  g.save(); g.translate(W / 2, H / 2); g.scale(1, (H / W) * 1.3);
  const r = W * 0.6;
  const gr = g.createRadialGradient(0, 0, r * 0.42, 0, 0, r * 1.08);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.16)'); gr.addColorStop(1, 'rgba(0,0,0,0.6)');
  g.fillStyle = gr; g.fillRect(-W, -W, 2 * W, 2 * W); g.restore();
  VIG = c;
  const [n, ng] = mk(W, H);
  const g2 = ng.createRadialGradient(960, 470, 40, 960, 520, 1150);
  g2.addColorStop(0, '#0d2a5c'); g2.addColorStop(0.45, '#061631'); g2.addColorStop(1, '#01040b');
  ng.fillStyle = g2; ng.fillRect(0, 0, W, H);
  NAVY = n;
}
async function buildLogo() {
  const txt = await (await fetch('brand/image-01.svg')).text();
  const doc = new DOMParser().parseFromString(txt, 'image/svg+xml');
  const paths = [...doc.querySelectorAll('path')];
  const SS = 4;
  for (const p of paths) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 254 260" width="${254 * SS}" height="${260 * SS}">${new XMLSerializer().serializeToString(p)}</svg>`;
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const img = new Image(); img.src = url; await img.decode();
    const [c, g] = mk(254 * SS, 260 * SS); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let X0 = c.width, Y0 = c.height, X1_ = 0, Y1 = 0;
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
      if (d[(y * c.width + x) * 4 + 3] > 8) { if (x < X0) X0 = x; if (x > X1_) X1_ = x; if (y < Y0) Y0 = y; if (y > Y1) Y1 = y; }
    }
    const pad = 6;
    X0 = Math.max(0, X0 - pad); Y0 = Math.max(0, Y0 - pad); X1_ = Math.min(c.width - 1, X1_ + pad); Y1 = Math.min(c.height - 1, Y1 + pad);
    const [cc, gg] = mk(X1_ - X0 + 1, Y1 - Y0 + 1); gg.drawImage(c, -X0, -Y0);
    LOGO.strokes.push({ c: cc, x: X0 / SS, y: Y0 / SS, w: cc.width / SS, h: cc.height / SS, gold: /FED608/i.test(p.getAttribute('fill') || '') });
  }
  LOGO.strokes.sort((a, b) => (a.y + a.h / 2) - (b.y + b.h / 2));
  let k = 0;
  for (const s of LOGO.strokes) {
    if (s.gold) { s.ts = 55.70; s.dist = 1500; }
    else { s.ts = 54.72 + 0.1 * k; s.dist = 1050 + 80 * k; k++; }
  }
}
function buildTickers() {
  const r = rng(42);
  for (let i = 0; i < 12; i++) {
    const size = [17, 22, 28, 34, 46, 15][i % 6];
    let s = '';
    for (let j = 0; j < 24; j++) s += (r() < 0.5 ? '+' : '−') + (r() * 9.99).toFixed(2) + (r() < 0.3 ? '%' : '') + '     ';
    const w = r() < 0.3 ? 700 : 400;
    const row = { y: 96 + i * 82 + (r() * 24 - 12), size, s, v: (i % 2 ? -1 : 1) * (70 + r() * 260), a: 0.10 + r() * 0.2, w, c: r() < 0.3 ? '#5CC8FF' : '#DCE6F5', x0: r() * 2000 };
    ox.save(); ox.font = `${w} ${size}px Lato`; row.len = ox.measureText(s).width; ox.restore();
    TICK.push(row);
  }
}
async function load() {
  await Promise.all(NAMES.map(async n => {
    const b = await (await fetch('stills/' + n + '.jpg')).blob();
    IM[n] = await createImageBitmap(b);
  }));
  await Promise.all(['400 80px Cinzel', '500 80px Cinzel', '600 80px Cinzel', '300 40px Lato', '400 40px Lato', '700 40px Lato'].map(f => document.fonts.load(f)));
  await document.fonts.ready;
  BL.lattice = blurred(IM.s11_lattice, 1024, 576, 14);
  BL.noise = blurred(IM.s07_noise, 1024, 576, 7);
  BL.lib = blurred(IM.s09_library, 1024, 576, 9, 'brightness(0.62)');
  BL.sun = blurred(IM.s13_sunrise, 1024, 576, 12);
  BL.inv = blurred(IM.s12_investor, 1024, 576, 7);
  GL.white = glowSprite(255, 255, 255);
  GL.warm = glowSprite(255, 210, 145);
  GL.gold = glowSprite(242, 196, 100);
  GL.cyan = glowSprite(80, 185, 255);
  GL.blue = glowSprite(18, 52, 120, 256, 1.6);
  GL.streak = glowSprite(255, 196, 140, 256, 1.4);
  buildGrain(); buildVignette(); buildTickers();
  await buildLogo();
  window.READY = true;
}

// ---------- drawing helpers ----------
function plate(g, im, o) {
  const s = o.s || 1, rot = o.rot || 0, iw = im.width, ih = im.height;
  const k = Math.max(W / iw, H / ih) * s;
  const c = Math.abs(Math.cos(rot)), sn = Math.abs(Math.sin(rot));
  const ofx = o.ox || 0, ofy = o.oy || 0;
  const hx = (W / 2 * c + H / 2 * sn + Math.abs(ofx)) / k, hy = (W / 2 * sn + H / 2 * c + Math.abs(ofy)) / k;
  let cx = (o.cx ?? 0.5) * iw, cy = (o.cy ?? 0.5) * ih;
  cx = hx * 2 >= iw ? iw / 2 : clamp(cx, hx, iw - hx);
  cy = hy * 2 >= ih ? ih / 2 : clamp(cy, hy, ih - hy);
  const a = o.a ?? 1;
  if (a > 0.002) {
    g.save(); g.globalAlpha = a;
    if (o.filter) g.filter = o.filter;
    if (o.op) g.globalCompositeOperation = o.op;
    g.translate(W / 2 + ofx, H / 2 + ofy); if (rot) g.rotate(rot); g.scale(k, k); g.translate(-cx, -cy);
    g.drawImage(im, 0, 0);
    g.restore();
  }
  return { k, cx, cy, rot, ox: ofx, oy: ofy, iw, ih };
}
function toScr(T, u, v) {
  let x = (u * T.iw - T.cx) * T.k, y = (v * T.ih - T.cy) * T.k;
  if (T.rot) { const c = Math.cos(T.rot), s = Math.sin(T.rot); const xx = x * c - y * s; y = x * s + y * c; x = xx; }
  return [x + W / 2 + T.ox, y + H / 2 + T.oy];
}
// image with scale relative to frame-cover, focus (fu,fv) placed at screen (px,py)
function placeImg(g, im, rel, fu, fv, px, py, a = 1) {
  const k = Math.max(W / im.width, H / im.height) * rel;
  g.save(); g.globalAlpha = a; g.translate(px, py); g.scale(k, k); g.translate(-fu * im.width, -fv * im.height);
  g.drawImage(im, 0, 0); g.restore();
}
function sprite(g, im, x, y, rw, rh, a, op = 'lighter') {
  if (a <= 0.002) return;
  g.save(); g.globalCompositeOperation = op; g.globalAlpha = Math.min(1, a);
  g.drawImage(im, x - rw, y - rh, rw * 2, rh * 2); g.restore();
}
function fontOf(o) { return `${o.w || 400} ${o.size}px ${o.fam || 'Lato'}`; }
function measureW(g, str, o) {
  g.save(); g.font = fontOf(o); g.letterSpacing = ((o.ls || 0) * o.size).toFixed(2) + 'px';
  const w = g.measureText(str).width; g.restore(); return w;
}
function textWidth(g, str, o) { return measureW(g, str, o) - (o.ls || 0) * o.size; }
function drawText(g, str, x, y, o) {
  const a = o.a ?? 1; if (a <= 0.003) return;
  g.save();
  g.font = fontOf(o);
  const lsp = (o.ls || 0) * o.size; g.letterSpacing = lsp.toFixed(2) + 'px';
  g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  const w = g.measureText(str).width - lsp;
  let x0 = x; if (o.al === 'center') x0 = x - w / 2; else if (o.al === 'right') x0 = x - w;
  g.globalAlpha = Math.min(1, a);
  if (o.op) g.globalCompositeOperation = o.op;
  if (o.blur && o.blur > 0.25) g.filter = `blur(${o.blur.toFixed(2)}px)`;
  if (o.glow) { g.shadowColor = o.glow.c; g.shadowBlur = o.glow.b; }
  g.fillStyle = typeof o.fill === 'function' ? o.fill(g, x0, y, w, o.size) : (o.fill || '#fff');
  g.fillText(str, x0, y);
  g.restore();
}
// characters fade/rise in one by one
function drawStagger(g, str, x, y, o, t, t0, per, stag) {
  const A = o.a ?? 1; if (A <= 0.003 || t < t0) return;
  g.save();
  g.font = fontOf(o);
  const lsp = (o.ls || 0) * o.size; g.letterSpacing = lsp.toFixed(2) + 'px';
  g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  const w = g.measureText(str).width - lsp;
  let x0 = x; if (o.al === 'center') x0 = x - w / 2; else if (o.al === 'right') x0 = x - w;
  g.fillStyle = typeof o.fill === 'function' ? o.fill(g, x0, y, w, o.size) : (o.fill || '#fff');
  if (o.glow) { g.shadowColor = o.glow.c; g.shadowBlur = o.glow.b; }
  for (let i = 0; i < str.length; i++) {
    const ch = str[i]; if (ch === ' ') continue;
    const u = inv(t0 + i * stag, t0 + i * stag + per, t); if (u <= 0) continue;
    const px = x0 + g.measureText(str.slice(0, i)).width;
    g.globalAlpha = A * smooth(u);
    const b = (1 - eo3(u)) * (o.blur0 || 0);
    g.filter = b > 0.25 ? `blur(${b.toFixed(2)}px)` : 'none';
    g.fillText(ch, px, y + (1 - eo3(u)) * (o.rise ?? 12));
  }
  g.restore();
}
// a line of segments that appear at their own times, laid out as one centred line
function segLine(g, segs, times, cx, y, o, t) {
  const full = segs.join('');
  const wTot = textWidth(g, full, o);
  let acc = '';
  for (let i = 0; i < segs.length; i++) {
    const xs = cx - wTot / 2 + (acc ? measureW(g, acc, o) : 0);
    const u = inv(times[i], times[i] + 0.5, t);
    if (u > 0) drawText(g, segs[i], xs, y + (1 - eo3(u)) * 10, { ...o, al: 'left', a: (o.a ?? 1) * smooth(u), blur: (1 - eo3(u)) * 5 });
    acc += segs[i];
  }
}
const goldFill = (g, x0, y, w, size) => {
  const gr = g.createLinearGradient(0, y - size * 0.78, 0, y + size * 0.04);
  gr.addColorStop(0, '#FFF4CC'); gr.addColorStop(0.5, '#F2D27A'); gr.addColorStop(1, '#C8963C'); return gr;
};
const whiteFill = (g, x0, y, w, size) => {
  const gr = g.createLinearGradient(0, y - size * 0.78, 0, y);
  gr.addColorStop(0, '#FFFFFF'); gr.addColorStop(1, '#D9E3F2'); return gr;
};
const champFill = (g, x0, y, w, size) => {
  const gr = g.createLinearGradient(0, y - size * 0.78, 0, y + size * 0.04);
  gr.addColorStop(0, '#FFFFFF'); gr.addColorStop(0.6, '#F7E7BE'); gr.addColorStop(1, '#E2BE6A'); return gr;
};
function scrim(g, cx, cy, rx, ry, a) {
  if (a <= 0.003) return;
  g.save(); g.translate(cx, cy); g.scale(1, ry / rx);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx);
  gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(0.6, `rgba(0,0,0,${a * 0.55})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(-rx, -rx, rx * 2, rx * 2); g.restore();
}
function starPath(g, cx, cy, R, rot) {
  g.beginPath();
  for (let i = 0; i < 16; i++) {
    const ang = rot + i * Math.PI / 8, r = i % 2 === 0 ? R : R * 0.7654;
    const x = cx + r * Math.cos(ang), y = cy + r * Math.sin(ang);
    if (i) g.lineTo(x, y); else g.moveTo(x, y);
  }
  g.closePath();
}
function flare(g, x, y, amt) {
  if (amt <= 0.003) return;
  sprite(g, GL.warm, x, y, 260, 260, amt * 0.75, 'screen');
  sprite(g, GL.white, x, y, 60, 60, amt * 0.7, 'screen');
  sprite(g, GL.streak, x, y, 1250, 16, amt * 0.7, 'screen');
  sprite(g, GL.cyan, x, y, 1700, 4, amt * 0.45, 'screen');
  const dx = W / 2 - x, dy = H / 2 - y;
  for (const [k, r, a] of [[0.55, 70, 0.07], [1.15, 26, 0.12], [1.55, 120, 0.05], [1.9, 16, 0.12], [2.3, 46, 0.06]]) {
    sprite(g, GL.cyan, x + dx * k, y + dy * k, r, r, amt * a, 'screen');
  }
}
function leak(g, t, x, y, a) {
  sprite(g, GL.warm, x + 120 * Math.sin(t * 0.35), y + 60 * Math.cos(t * 0.27), 900, 700, a, 'screen');
}
function glowStroke(g, draw, color, glowC, width, blur) {
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  g.strokeStyle = color; g.lineWidth = width; g.shadowColor = glowC; g.shadowBlur = blur;
  draw(); g.stroke(); g.restore();
}

// ---------- shots ----------
// SH01 0-6.0: horizon line of light, Earth, accelerating dive into the Gulf
function sh01(g, t) {
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  let s, cx = 0.5, cy = 0.5;
  if (t < 4.3) s = lerp(1.04, 1.12, smooth(inv(0, 4.3, t)));
  else {
    const u = inv(4.3, 6.0, t);
    s = 1.12 * Math.exp(Math.log(10 / 1.12) * Math.pow(u, 2.2));
    const fu = smooth(inv(4.3, 5.7, t)); cx = lerp(0.5, 0.925, fu); cy = lerp(0.5, 0.815, fu);
  }
  const a = smooth(inv(0.9, 2.7, t));
  if (a > 0) plate(g, IM.s01_earth, { s, cx, cy, a });
  // the first light: a horizon line drawn from the centre outwards
  const la = smooth(inv(0.40, 0.6, t)) * (1 - smooth(inv(1.7, 2.9, t)));
  if (la > 0) {
    const half = 980 * eo3(inv(0.43, 1.4, t)), y = 439;
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = la;
    const gr = g.createLinearGradient(960 - half, 0, 960 + half, 0);
    gr.addColorStop(0, 'rgba(43,179,238,0)'); gr.addColorStop(0.2, 'rgba(43,179,238,0.9)');
    gr.addColorStop(0.5, 'rgba(255,240,200,1)'); gr.addColorStop(0.8, 'rgba(43,179,238,0.9)'); gr.addColorStop(1, 'rgba(43,179,238,0)');
    g.fillStyle = gr; g.shadowColor = 'rgba(80,190,255,0.9)'; g.shadowBlur = 18;
    g.fillRect(960 - half, y - 1.2, half * 2, 2.4);
    g.restore();
    sprite(g, GL.warm, 960, y, 260 * eo3(inv(0.43, 1.0, t)) + 1, 26, la * 0.8);
    sprite(g, GL.cyan, 960, y, half * 1.05 + 1, 40, la * 0.35);
  }
}
function dropIn(t, t0, s0, s1, dur) { return lerp(s0, s1, eo5(inv(t0, t0 + dur, t))); }
function sh02(g, t) {
  const s = dropIn(t, 6.0, 1.55, 1.13, 1.05) * (1 - 0.035 * smooth(inv(6.9, 8.8, t)));
  plate(g, IM.s02_gulf_dusk, { s, cx: 0.52, cy: 0.56 });
}
function sh03(g, t) {
  const u = inv(8.79, 10.18, t);
  plate(g, IM.s06_solar, { s: lerp(1.32, 1.22, eo3(u)), cx: lerp(0.36, 0.56, eo3(u)), cy: 0.55, rot: lerp(0.025, 0, eo3(u)) });
}
function sh04(g, t) {
  const u = inv(10.18, 11.58, t);
  plate(g, IM.s05_port, { s: dropIn(t, 10.18, 1.5, 1.18, 1.0) * (1 - 0.02 * u), rot: lerp(0.09, 0.0, eo5(inv(10.18, 11.3, t))), cx: 0.5, cy: 0.5 });
}
// SH05 11.58-13.43: micro-shot burst
const BURST = [
  { n: 7, im: 's03_europe', s0: 1.30, s1: 1.46, cx: 0.5, cy: 0.5, dx: -40 },
  { n: 4, im: 's04_asia', s0: 1.62, s1: 1.52, cx: 0.72, cy: 0.56, dx: 60 },
  { n: 9, im: 's02_gulf_dusk', s0: 2.15, s1: 2.5, cx: 0.74, cy: 0.33, dx: 0 },
  { n: 5, im: 's05_port', s0: 2.0, s1: 2.05, cx: 0.5, cy: 0.4, dx: -70, rot: 0.08 },
  { n: 7, im: 's06_solar', s0: 1.8, s1: 2.1, cx: 0.42, cy: 0.38, dx: 30 },
  { n: 4, im: 's03_europe', s0: 2.4, s1: 2.3, cx: 0.45, cy: 0.3, dx: 60 },
  { n: 8, im: 's04_asia', s0: 2.0, s1: 2.45, cx: 0.79, cy: 0.5, dx: -30 },
];
function sh05(g, t) {
  const f = (t - 11.58) * FPS;
  let acc = 0, b = BURST[BURST.length - 1], lf = 0;
  for (const x of BURST) { if (f < acc + x.n) { b = x; lf = (f - acc) / x.n; break; } acc += x.n; }
  if (f >= 44) lf = 1;
  plate(g, IM[b.im], { s: lerp(b.s0, b.s1, lf), cx: b.cx, cy: b.cy, ox: b.dx * (lf - 0.5), rot: b.rot ? b.rot * (1 - lf) : 0 });
}
// SH06 13.43-16.92: the noise. shake, breathing blur, RGB split, tickers
function tickers(g, t, k) {
  for (const r of TICK) {
    g.save(); g.font = `${r.w} ${r.size}px Lato`; g.fillStyle = r.c; g.globalAlpha = r.a * k;
    let x = ((r.x0 + r.v * t) % r.len + r.len) % r.len;
    g.fillText(r.s, -x, r.y); g.fillText(r.s, -x + r.len, r.y);
    g.restore();
  }
}
function sh06(g, t) {
  const u = inv(13.43, 16.92, t);
  const chaos = 0.4 + 0.6 * smooth(inv(15.4, 16.9, t));
  const pulse = Math.exp(-sinceBeat(t) / 0.11);
  const shx = (vnoise(t * 6, 1) * 12 + vnoise(t * 21, 2) * 5) * chaos;
  const shy = (vnoise(t * 6, 3) * 8 + vnoise(t * 19, 4) * 4) * chaos;
  const P = { s: 1.17 + 0.07 * u + 0.035 * pulse, cx: 0.5, cy: 0.46, ox: shx, oy: shy, rot: vnoise(t * 2.5, 5) * 0.01 * chaos };
  x2.save(); x2.fillStyle = '#000'; x2.fillRect(0, 0, W, H);
  plate(x2, IM.s07_noise, P);
  const breath = clamp(0.25 + 0.35 * Math.sin(t * 5.1) + 0.4 * pulse + 0.4 * smooth(inv(16.3, 16.9, t)));
  plate(x2, BL.noise, { ...P, a: breath * 0.85 });
  tickers(x2, t, 0.6 + 0.6 * chaos);
  x2.restore();
  const d = 2.5 + 11 * pulse * chaos + 12 * smooth(inv(16.2, 16.9, t));
  g.save();
  g.globalCompositeOperation = 'copy'; g.drawImage(X2, 0, 0);
  g.globalCompositeOperation = 'multiply'; g.fillStyle = '#00ff00'; g.fillRect(0, 0, W, H);
  for (const [dx, col] of [[d, '#ff0000'], [-d, '#0000ff']]) {
    x3.save(); x3.globalCompositeOperation = 'copy'; x3.drawImage(X2, dx - d, -d * H / W, W + 2 * d, H + 2 * d * H / W);
    x3.globalCompositeOperation = 'multiply'; x3.fillStyle = col; x3.fillRect(0, 0, W, H); x3.restore();
    g.globalCompositeOperation = 'lighter'; g.drawImage(X3, 0, 0);
  }
  g.restore();
  // exposure flicker towards the cut
  const fl = smooth(inv(16.5, 16.9, t)) * (0.5 + 0.5 * hash1(Math.floor(t * 24)));
  if (fl > 0) { g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(160,190,255,${0.12 * fl})`; g.fillRect(0, 0, W, H); g.restore(); }
}
// SH07 16.92-20.40: the signal. A gold line out of the noise, collapsing into the tower's lit window
const WIN = { u0: 893 / 2048, u1: 1129 / 2048, v0: 512 / 1152, v1: 638 / 1152 };
const WC = { u: (WIN.u0 + WIN.u1) / 2, v: (WIN.v0 + WIN.v1) / 2 };
const WR = { x0: (WIN.u0 - 0.5) * W + 960, x1: (WIN.u1 - 0.5) * W + 960, y0: (WIN.v0 - 0.5) * H + 540, y1: (WIN.v1 - 0.5) * H + 540 };
function sh07(g, t) {
  g.fillStyle = '#02050b'; g.fillRect(0, 0, W, H);
  sprite(g, GL.blue, 960, 540, 1100, 700, 0.55 * smooth(inv(16.95, 18.0, t)), 'screen');
  const L0 = 160, L1 = 1760, Y = 540;
  const head = lerp(L0, L1, eio(inv(17.25, 18.85, t)));
  const col = inv(19.85, 20.32, t);
  if (col <= 0) {
    // noise scribble, calmed where the signal has passed
    const sa = 0.32 * smooth(inv(16.93, 17.15, t)) * (1 - smooth(inv(18.6, 19.4, t)));
    if (sa > 0) {
      g.save(); g.strokeStyle = 'rgba(190,205,230,1)'; g.globalAlpha = sa; g.lineWidth = 1.3; g.beginPath();
      const fr = Math.floor(t * 24);
      for (let x = L0; x <= L1; x += 5) {
        const calm = x < head ? 0.06 : 1;
        const n = vnoise(x * 0.045 + t * 7, 7) * 0.65 + (hash1(x * 0.37 + fr * 13.1) * 2 - 1) * 0.35;
        const y = Y + n * 34 * calm * (0.6 + 0.4 * Math.sin(x * 0.011 + t * 3));
        if (x === L0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.stroke(); g.restore();
    }
    if (t >= 17.25) {
      glowStroke(g, () => { g.beginPath(); g.moveTo(L0, Y); g.lineTo(head, Y); }, (() => {
        const gr = g.createLinearGradient(L0, 0, Math.max(L0 + 1, head), 0);
        gr.addColorStop(0, 'rgba(168,120,42,0.0)'); gr.addColorStop(0.25, 'rgba(217,169,63,0.9)'); gr.addColorStop(1, '#FFF3C4'); return gr;
      })(), 'rgba(242,210,122,0.85)', 2.6, 16);
      const hv = 1 - smooth(inv(18.8, 19.2, t));
      sprite(g, GL.gold, head, Y, 90, 90, 0.9 * hv + 0.15);
      sprite(g, GL.white, head, Y, 16, 16, 0.9 * hv);
      // the pulse on "signal"
      const pu = inv(19.08, 19.7, t);
      if (pu > 0 && pu < 1) {
        const px = lerp(L0, L1, eio(pu));
        sprite(g, GL.warm, px, Y, 160, 40, 0.9 * Math.sin(Math.PI * pu));
        sprite(g, GL.white, px, Y, 30, 6, 0.8 * Math.sin(Math.PI * pu));
      }
      sprite(g, GL.warm, 960, Y, 900, 60, 0.18 * smooth(inv(18.6, 19.3, t)));
    }
  } else {
    const u = eio(col);
    const xa = lerp(L0, WR.x0, u), xb = lerp(L1, WR.x1, u), ya = lerp(Y, WR.y0, u), yb = lerp(Y, WR.y1, u);
    const fill = smooth(inv(20.12, 20.40, t));
    if (fill > 0) {
      g.save(); g.globalAlpha = fill;
      const gr = g.createLinearGradient(0, ya, 0, yb); gr.addColorStop(0, '#FFE6A6'); gr.addColorStop(1, '#E0A84A');
      g.fillStyle = gr; g.fillRect(xa, ya, xb - xa, yb - ya); g.restore();
      sprite(g, GL.warm, (xa + xb) / 2, (ya + yb) / 2, (xb - xa) * 1.4, (yb - ya) * 2.2, 0.6 * fill);
    }
    glowStroke(g, () => { g.beginPath(); g.rect(xa, ya, xb - xa, Math.max(0.5, yb - ya)); }, '#FFE9B0', 'rgba(242,210,122,0.9)', 2.4, 16);
    sprite(g, GL.warm, (xa + xb) / 2, (ya + yb) / 2, (xb - xa) * 0.7, 80, 0.35 * (1 - u));
  }
}
// SH08 20.40-24.58: the push into the lit window; the library seen through it with parallax
const S_END = 9.6, RHO = 0.12, L1S = 0.234;
function towerS(t) { return Math.exp(Math.log(S_END) * Math.pow(inv(20.40, 24.58, t), 1.6)); }
function libScale(d) { return L1S * (1 + RHO) / (d + RHO); }
function sh08(g, t) {
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  const s = towerS(t);
  const pa = smooth(inv(20.40, 20.85, t));
  const T = plate(g, IM.s08_tower, { s, cx: WC.u, cy: WC.v, a: pa });
  const [wx0, wy0] = toScr(T, WIN.u0, WIN.v0), [wx1, wy1] = toScr(T, WIN.u1, WIN.v1);
  const [wcx, wcy] = toScr(T, WC.u, WC.v);
  const la = smooth(inv(1.35, 3.6, s));
  g.save(); g.beginPath(); g.rect(wx0, wy0, wx1 - wx0, wy1 - wy0); g.clip();
  if (pa < 1) { g.fillStyle = '#F0C060'; g.globalAlpha = 1 - pa; g.fillRect(wx0, wy0, wx1 - wx0, wy1 - wy0); g.globalAlpha = 1; }
  if (la > 0) placeImg(g, IM.s09_library, libScale(1 / s), 0.5, 0.5, wcx, wcy, la);
  const warm = (1 - smooth(inv(2.5, 8, s))) * 0.55 + 0.12;
  g.globalCompositeOperation = 'screen'; g.fillStyle = `rgba(255,200,120,${warm})`; g.fillRect(wx0, wy0, wx1 - wx0, wy1 - wy0);
  g.restore();
  const ww = wx1 - wx0, wh = wy1 - wy0;
  sprite(g, GL.warm, wcx, wcy, ww * 1.5, wh * 2.4, 0.55 + 0.25 * smooth(inv(1, 6, s)), 'screen');
  sprite(g, GL.gold, wcx, wcy, ww * 3.2, wh * 4.5, 0.18, 'screen');
  // the outline handed over from the signal line
  const oa = 1 - smooth(inv(20.40, 20.8, t));
  if (oa > 0) {
    g.save(); g.globalAlpha = oa;
    glowStroke(g, () => { g.beginPath(); g.rect(wx0, wy0, ww, wh); }, '#FFE9B0', 'rgba(242,210,122,0.9)', 2.4, 16);
    g.restore();
  }
  leak(g, t, 1500, 300, 0.12 * smooth(inv(21, 23, t)));
}
// SH09 24.58-30.15: inside. The library, momentum carried through the glass
const D_END = 1 / S_END, V_END = (1 / S_END) * Math.log(S_END) * 1.6 / (24.58 - 20.40);
function P09(t) {
  const tp = Math.max(0, t - 24.58);
  const d = D_END - V_END * 0.32 * (1 - Math.exp(-tp / 0.32)) - 0.0016 * tp;
  return { s: libScale(d), cx: 0.5, cy: lerp(0.5, 0.465, smooth(inv(24.58, 27.0, t))) };
}
function sh09(g, t) {
  plate(g, IM.s09_library, P09(t));
  leak(g, t, 400, 200, 0.08);
}
// wipe 29.95-30.45: a diagonal blade of gold light
const TANW = 0.364;
function wipeP(t) { return lerp(-250, 2550, eio(inv(29.95, 30.45, t))); }
function wipe(g, t) {
  sh09(g, t);
  const p = wipeP(t);
  g.save(); g.beginPath(); g.moveTo(-5, -5); g.lineTo(p + 2, -5); g.lineTo(p - TANW * H - 2, H + 5); g.lineTo(-5, H + 5); g.closePath(); g.clip();
  sh10(g, t); g.restore();
  const nx = 0.9397, ny = 0.342, cx = p - TANW * 540, cy = 540;
  const gr = g.createLinearGradient(cx - nx * 220, cy - ny * 220, cx + nx * 220, cy + ny * 220);
  gr.addColorStop(0, 'rgba(242,200,110,0)'); gr.addColorStop(0.38, 'rgba(242,200,110,0.30)');
  gr.addColorStop(0.5, 'rgba(255,248,226,0.95)'); gr.addColorStop(0.62, 'rgba(242,200,110,0.30)'); gr.addColorStop(1, 'rgba(242,200,110,0)');
  g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = gr; g.fillRect(0, 0, W, H); g.restore();
}
// SH10 30.15-33.87: the report on the desk; a gold thread runs the spine and the cover rule
function P10(t) { const u = inv(29.95, 33.87, t); return { s: lerp(1.12, 1.22, smooth(u)), rot: lerp(-0.03, 0, eo3(u)), cx: 0.5, cy: 0.52 }; }
function comet(g, T, pa, pb, t, t0, t1) {
  const u = inv(t0, t1, t); if (u <= 0) return;
  const [ax, ay] = toScr(T, pa[0], pa[1]), [bx, by] = toScr(T, pb[0], pb[1]);
  const e = eio(u), hx = lerp(ax, bx, e), hy = lerp(ay, by, e);
  const tu = Math.max(0, e - 0.4), tx = lerp(ax, bx, tu), ty = lerp(ay, by, tu);
  const fade = 1 - smooth(inv(t1, t1 + 1.0, t));
  g.save(); g.globalCompositeOperation = 'screen'; g.lineCap = 'round';
  g.strokeStyle = `rgba(242,210,122,${(0.45 * fade).toFixed(3)})`; g.lineWidth = 2.2;
  g.shadowColor = 'rgba(242,210,122,0.8)'; g.shadowBlur = 10;
  g.beginPath(); g.moveTo(ax, ay); g.lineTo(hx, hy); g.stroke();
  if (u < 1) {
    const gr = g.createLinearGradient(tx, ty, hx + 0.01, hy + 0.01);
    gr.addColorStop(0, 'rgba(242,210,122,0)'); gr.addColorStop(1, 'rgba(255,245,210,1)');
    g.strokeStyle = gr; g.lineWidth = 3.6; g.shadowBlur = 18; g.beginPath(); g.moveTo(tx, ty); g.lineTo(hx, hy); g.stroke();
  }
  g.restore();
  if (u < 1) { sprite(g, GL.gold, hx, hy, 70, 70, 0.95); sprite(g, GL.white, hx, hy, 14, 14, 0.95); }
}
function sh10(g, t) {
  const T = plate(g, IM.s10_desk, P10(t));
  comet(g, T, [0.305, 0.318], [0.497, 0.708], t, 31.0, 32.1);
  comet(g, T, [0.495, 0.612], [0.672, 0.462], t, 32.0, 32.9);
}
// star transition 33.55-34.05
function starTrans(g, t) {
  sh10(g, t);
  const u = inv(33.55, 34.05, t);
  const R = 8 + 1520 * Math.pow(u, 2.0), rot = 0.55 * (1 - eo3(u));
  g.save(); starPath(g, 960, 540, R, rot); g.clip(); sh11(g, t); g.restore();
  g.save(); starPath(g, 960, 540, R, rot); g.lineJoin = 'miter';
  g.lineWidth = 2 + 5 * u; g.strokeStyle = 'rgba(255,236,190,0.95)'; g.shadowColor = 'rgba(242,210,122,0.95)'; g.shadowBlur = 26;
  g.globalCompositeOperation = 'screen'; g.stroke(); g.restore();
}
// SH11 33.87-39.44: the lattice
function P11(t) { return { s: lerp(1.05, 1.17, smooth(inv(33.55, 39.6, t))), cx: 0.52, cy: 0.5 }; }
function sh11(g, t) { plate(g, IM.s11_lattice, P11(t)); }
// SH12 39.44-43.62: conviction and compliance
const MOTES = (() => { const r = rng(7); return Array.from({ length: 34 }, () => ({ x: r() * W, y: r() * H, r: 6 + r() * 26, v: 8 + r() * 22, a: 0.05 + r() * 0.16, ph: r() * 6.28 })); })();
function sh12(g, t) {
  plate(g, BL.lib, { s: lerp(1.04, 1.12, smooth(inv(39.3, 43.9, t))), cx: 0.5, cy: 0.48 });
  g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgb(120,140,190)'; g.fillRect(0, 0, W, H); g.restore();
  for (const m of MOTES) {
    const y = ((m.y - m.v * t) % H + H) % H, x = m.x + 20 * Math.sin(t * 0.5 + m.ph);
    sprite(g, GL.gold, x, y, m.r, m.r, m.a * (0.7 + 0.3 * Math.sin(t * 1.3 + m.ph)), 'screen');
  }
}
// SH13 43.62-49.66: the investor at the glass
function P13(t) { return { s: lerp(1.06, 1.17, smooth(inv(43.4, 49.9, t))), cx: 0.56, cy: 0.47 }; }
function sh13(g, t) {
  const P = P13(t);
  const T = plate(g, IM.s12_investor, P);
  const fp = 1 - smooth(inv(43.7, 44.9, t));
  if (fp > 0) plate(g, BL.inv, { ...P, a: fp });
  const [fx, fy] = toScr(T, 0.40, 0.255);
  flare(g, fx, fy, 0.5 + 0.1 * Math.sin(t * 1.7));
}
// SH14 49.66-54.30: sunrise
function P14(t) { return { s: lerp(1.04, 1.17, smooth(inv(49.5, 58, t))), cx: 0.6, cy: 0.46 }; }
function sh14(g, t) {
  const T = plate(g, IM.s13_sunrise, P14(t));
  const [fx, fy] = toScr(T, 0.69, 0.45);
  flare(g, fx, fy, 0.62 + 0.08 * Math.sin(t * 1.4));
  leak(g, t, 1650, 380, 0.12);
  const nd = g.createLinearGradient(0, 0, 0, 640);
  nd.addColorStop(0, 'rgba(2,9,24,0.62)'); nd.addColorStop(0.6, 'rgba(2,9,24,0.3)'); nd.addColorStop(1, 'rgba(2,9,24,0)');
  g.fillStyle = nd; g.fillRect(0, 0, W, 640);
}
// SH15 54.30-64.0: the mark resolves
const MS = 300 / 260, MX0 = 960 - 254 * MS / 2, MY0 = 395 - 130 * MS;
function groupZoom(t) { return 1 + 0.035 * smooth(inv(56.0, 64.0, t)); }
function logoStrokes(g, t) {
  g.save(); const z = groupZoom(t); g.translate(960, 540); g.scale(z, z); g.translate(-960, -540);
  for (const st of LOGO.strokes) {
    const u = inv(st.ts, st.ts + 0.9, t); if (u <= 0) continue;
    const e = eoX(u), dx = -st.dist * (1 - e), stretch = 1 + 1.8 * Math.pow(1 - e, 1.6);
    const w = st.w * MS, h = st.h * MS, xr = MX0 + (st.x + st.w) * MS + dx, y = MY0 + st.y * MS;
    g.globalAlpha = smooth(inv(0, 0.08, u));
    g.shadowColor = st.gold ? 'rgba(254,214,8,0.6)' : 'rgba(10,157,222,0.55)'; g.shadowBlur = 22;
    g.drawImage(st.c, xr - w * stretch, y, w * stretch, h);
  }
  g.restore();
}
function sh15(g, t) {
  sh14(g, t);
  const P = P14(t);
  const bu = smooth(inv(54.3, 55.3, t)); if (bu > 0) plate(g, BL.sun, { ...P, a: bu });
  const nv = smooth(inv(54.35, 55.75, t));
  g.save(); g.globalAlpha = nv * 0.95; g.drawImage(NAVY, 0, 0); g.restore();
  sprite(g, GL.cyan, 960, 395, 620, 380, 0.10 * nv, 'screen');
  logoStrokes(g, t);
}

// ---------- scene dispatch (motion-blurred part) ----------
function xfade(g, t, a, b, fa, fb) {
  fa(g, t);
  const u = smooth(inv(a, b, t)); if (u <= 0) return;
  x1.save(); fb(x1, t); x1.restore();
  g.save(); g.globalAlpha = u; g.drawImage(X1, 0, 0); g.restore();
}
function scene(g, t) {
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  if (t < 6.0) return sh01(g, t);
  if (t < 8.79) return sh02(g, t);
  if (t < 10.18) return sh03(g, t);
  if (t < 11.58) return sh04(g, t);
  if (t < 13.43) return sh05(g, t);
  if (t < 16.92) return sh06(g, t);
  if (t < 20.40) return sh07(g, t);
  if (t < 24.58) return sh08(g, t);
  if (t < 29.95) return sh09(g, t);
  if (t < 30.45) return wipe(g, t);
  if (t < 33.55) return sh10(g, t);
  if (t < 34.05) return starTrans(g, t);
  if (t < 39.30) return sh11(g, t);
  if (t < 39.62) return xfade(g, t, 39.30, 39.62, sh11, sh12);
  if (t < 43.40) return sh12(g, t);
  if (t < 43.85) return xfade(g, t, 43.40, 43.85, sh12, sh13);
  if (t < 49.50) return sh13(g, t);
  if (t < 49.80) return xfade(g, t, 49.50, 49.80, sh13, sh14);
  if (t < 54.30) return sh14(g, t);
  return sh15(g, t);
}
function samplesAt(t) {
  if (t >= 4.2 && t < 6.0) return 10;
  if (t >= 6.0 && t < 6.95) return 6;
  if (t >= 8.79 && t < 9.4) return 4;
  if (t >= 10.18 && t < 10.95) return 5;
  if (t >= 11.58 && t < 13.43) return 4;
  if (t >= 13.43 && t < 16.92) return 3;
  if (t >= 17.25 && t < 18.9) return 2;
  if (t >= 19.85 && t < 20.40) return 3;
  if (t >= 20.40 && t < 24.58) return t > 22.6 ? 8 : 4;
  if (t >= 24.58 && t < 25.5) return 4;
  if (t >= 29.95 && t < 30.45) return 4;
  if (t >= 31.0 && t < 32.9) return 2;
  if (t >= 33.55 && t < 34.05) return 4;
  if (t >= 54.7 && t < 56.6) return 10;
  return 1;
}

// ---------- overlays (crisp, drawn once per frame) ----------
function counter(g, t, t0, tl, num, suf, label) {
  const a = smooth(inv(t0, t0 + 0.2, t)); if (a <= 0) return;
  scrim(g, 960, 560, 820, 300, 0.42 * a);
  const u = inv(t0, tl, t), val = Math.round(num * eoX(u));
  const size = 250, y = 622;
  const o = { fam: 'Cinzel', w: 500, size, ls: 0.02, fill: champFill, glow: { c: 'rgba(0,0,0,0.45)', b: 40 } };
  const wNum = textWidth(g, String(num), o), wSuf = suf ? textWidth(g, suf, { ...o, w: 400 }) : 0, gap = suf ? 8 : 0;
  const x0 = 960 - (wNum + gap + wSuf) / 2;
  const blur = 8 * (1 - eo3(inv(t0, t0 + 0.45, t)));
  drawText(g, String(val), x0 + wNum, y, { ...o, al: 'right', a, blur });
  if (suf) drawText(g, suf, x0 + wNum + gap, y, { ...o, w: 400, a: a * smooth(inv(tl - 0.08, tl + 0.18, t)), blur });
  const la = smooth(inv(t0 + 0.1, t0 + 0.55, t)), ls = lerp(1.0, 0.62, eo3(inv(t0 + 0.08, t0 + 1.1, t)));
  drawText(g, label, 960, y + 78, { fam: 'Lato', w: 400, size: 28, ls, al: 'center', fill: '#F2D27A', a: la, glow: { c: 'rgba(0,0,0,0.6)', b: 14 } });
  const hw = 64 * eo3(inv(t0 + 0.2, t0 + 0.8, t));
  if (hw > 0.5) { g.save(); g.globalAlpha = la; g.fillStyle = '#F2D27A'; g.fillRect(960 - hw, y + 32, hw * 2, 1.6); g.restore(); }
}
function ov09(g, t) {
  g.save();
  if (t >= 29.95) {
    const p = wipeP(t);
    g.beginPath(); g.moveTo(p, -5); g.lineTo(W + 5, -5); g.lineTo(W + 5, H + 5); g.lineTo(p - TANW * H, H + 5); g.closePath(); g.clip();
  }
  const a = smooth(inv(25.3, 26.0, t));
  const gr = g.createLinearGradient(0, H, 0, 560);
  gr.addColorStop(0, `rgba(0,0,0,${0.62 * a})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 560, W, H - 560);
  const u = inv(25.42, 26.8, t);
  drawText(g, 'INSTITUTIONAL-GRADE RESEARCH', 960, 858, {
    fam: 'Cinzel', w: 500, size: 60, ls: lerp(0.5, 0.17, eo5(u)), al: 'center', fill: whiteFill,
    a: smooth(inv(25.42, 26.1, t)), blur: 10 * (1 - eo3(inv(25.42, 26.3, t))), glow: { c: 'rgba(0,0,0,0.5)', b: 24 },
  });
  segLine(g, ['COUNTRIES', '  ·  ', 'SECTORS', '  ·  ', 'INDUSTRIES'], [27.28, 28.2, 28.28, 29.0, 29.08], 960, 922,
    { fam: 'Lato', w: 400, size: 23, ls: 0.42, fill: '#F2D27A', glow: { c: 'rgba(0,0,0,0.6)', b: 12 } }, t);
  g.restore();
}
function ov10(g, t) {
  const out = 1 - smooth(inv(33.35, 33.75, t));
  const gr = g.createLinearGradient(0, H, 0, 600);
  gr.addColorStop(0, `rgba(0,0,0,${0.5 * smooth(inv(30.4, 31.0, t)) * out})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 600, W, H - 600);
  drawStagger(g, 'SHARIAH INTELLIGENCE', 150, 878, { fam: 'Cinzel', w: 500, size: 58, ls: 0.12, fill: goldFill, a: out, blur0: 8, rise: 14, glow: { c: 'rgba(0,0,0,0.5)', b: 20 } }, t, 30.56, 0.55, 0.035);
  const su = inv(31.7, 32.6, t);
  drawText(g, 'WOVEN THROUGH EVERY REPORT', 153, 934, { fam: 'Lato', w: 400, size: 22, ls: lerp(0.7, 0.42, eo3(su)), fill: '#E8EEF8', a: smooth(su) * out * 0.9, glow: { c: 'rgba(0,0,0,0.6)', b: 12 } });
}
function roundRect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function checkRow(g, t, tc, y, label, a) {
  const on = smooth(inv(tc, tc + 0.25, t));
  const cx = 232, cy = y - 11, r = 19;
  drawText(g, label, 284, y, { fam: 'Lato', w: 400, size: 34, fill: '#FFFFFF', a: a * (0.38 + 0.62 * on) });
  g.save(); g.globalAlpha = a; g.lineCap = 'round'; g.lineJoin = 'round';
  g.strokeStyle = 'rgba(255,255,255,0.28)'; g.lineWidth = 1.5; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke();
  const cu = eo3(inv(tc, tc + 0.32, t));
  if (cu > 0) {
    g.strokeStyle = '#F2D27A'; g.lineWidth = 2.2; g.shadowColor = 'rgba(242,210,122,0.8)'; g.shadowBlur = 12;
    g.beginPath(); g.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * cu); g.stroke();
    g.fillStyle = `rgba(242,210,122,${0.16 * cu})`; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
  }
  const ku = eo3(inv(tc + 0.18, tc + 0.42, t));
  if (ku > 0) {
    const p0 = [cx - 8, cy + 1], p1 = [cx - 2.5, cy + 7], p2 = [cx + 9, cy - 6.5];
    const L1 = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), L2 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const d = ku * (L1 + L2);
    g.strokeStyle = '#FFF3C4'; g.lineWidth = 2.6; g.beginPath(); g.moveTo(p0[0], p0[1]);
    if (d <= L1) g.lineTo(lerp(p0[0], p1[0], d / L1), lerp(p0[1], p1[1], d / L1));
    else { g.lineTo(p1[0], p1[1]); const e = (d - L1) / L2; g.lineTo(lerp(p1[0], p2[0], e), lerp(p1[1], p2[1], e)); }
    g.stroke();
  }
  g.restore();
  if (on > 0 && on < 1) sprite(g, GL.gold, cx, cy, 60, 60, 0.5 * Math.sin(Math.PI * on));
}
function ov11(g, t) {
  const a = smooth(inv(34.0, 34.55, t)) * (1 - smooth(inv(39.28, 39.6, t)));
  if (a <= 0.003) return;
  const rise = (1 - eo3(inv(34.0, 34.7, t))) * 46;
  const X = 140, Y = 286 + rise, Wd = 720, Hd = 512, R = 22;
  g.save(); g.globalAlpha = a;
  g.save(); g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 70; g.shadowOffsetY = 24; g.fillStyle = 'rgba(4,12,30,0.35)';
  roundRect(g, X, Y, Wd, Hd, R); g.fill(); g.restore();
  g.save(); roundRect(g, X, Y, Wd, Hd, R); g.clip();
  plate(g, BL.lattice, { ...P11(t), a });
  g.fillStyle = 'rgba(4,17,50,0.74)'; g.fillRect(X, Y, Wd, Hd);
  const hl = g.createLinearGradient(X, Y, X + Wd * 0.6, Y + Hd);
  hl.addColorStop(0, 'rgba(255,255,255,0.10)'); hl.addColorStop(0.5, 'rgba(255,255,255,0.0)');
  g.fillStyle = hl; g.fillRect(X, Y, Wd, Hd);
  g.restore();
  const bd = g.createLinearGradient(X, Y, X + Wd, Y + Hd);
  bd.addColorStop(0, 'rgba(255,255,255,0.42)'); bd.addColorStop(0.5, 'rgba(255,255,255,0.10)'); bd.addColorStop(1, 'rgba(242,210,122,0.35)');
  g.strokeStyle = bd; g.lineWidth = 1.4; roundRect(g, X + 0.7, Y + 0.7, Wd - 1.4, Hd - 1.4, R); g.stroke();
  // header
  g.save(); starPath(g, 222, Y + 76, 15, Math.PI / 8); g.strokeStyle = '#F2D27A'; g.lineWidth = 1.6; g.stroke(); g.restore();
  g.save(); starPath(g, 222, Y + 76, 5, Math.PI / 8); g.fillStyle = '#F2D27A'; g.fill(); g.restore();
  g.restore();
  drawText(g, 'SHARIAH SCREENING', 256, Y + 84, { fam: 'Lato', w: 700, size: 20, ls: 0.34, fill: '#F2D27A', a });
  g.save(); g.globalAlpha = a; g.fillStyle = 'rgba(255,255,255,0.16)'; g.fillRect(200, Y + 120, 600, 1); g.restore();
  checkRow(g, t, 34.36, Y + 205, 'Business activity screens', a);
  checkRow(g, t, 36.51, Y + 295, 'Financial ratios', a);
  checkRow(g, t, 38.16, Y + 385, 'Purification guidance', a);
  const ba = smooth(inv(38.85, 39.2, t)) * a;
  if (ba > 0) {
    const bw = textWidth(g, 'AAOIFI-ALIGNED', { fam: 'Lato', w: 700, size: 15, ls: 0.3 }) + 44;
    g.save(); g.globalAlpha = ba; g.strokeStyle = 'rgba(242,210,122,0.75)'; g.lineWidth = 1.2;
    roundRect(g, 212, Y + 440, bw, 36, 18); g.stroke(); g.fillStyle = 'rgba(242,210,122,0.10)'; g.fill(); g.restore();
    drawText(g, 'AAOIFI-ALIGNED', 234, Y + 464, { fam: 'Lato', w: 700, size: 15, ls: 0.3, fill: '#F2D27A', a: ba });
  }
}
const CF = { x0: 150, x1: 1770, yT: 318, yB: 640 };
function polyPartial(g, pts, frac) {
  let L = 0; const seg = [];
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); L += l; }
  let d = frac * L; g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    if (d >= seg[i - 1]) { g.lineTo(pts[i][0], pts[i][1]); d -= seg[i - 1]; }
    else { const e = d / seg[i - 1]; g.lineTo(lerp(pts[i - 1][0], pts[i][0], e), lerp(pts[i - 1][1], pts[i][1], e)); return [lerp(pts[i - 1][0], pts[i][0], e), lerp(pts[i - 1][1], pts[i][1], e)]; }
  }
  return pts[pts.length - 1];
}
function ov12(g, t) {
  const A = smooth(inv(39.5, 39.9, t)) * (1 - smooth(inv(43.35, 43.75, t)));
  if (A <= 0.003) return;
  const y = 505;
  const cu = inv(40.18, 40.9, t);
  drawText(g, 'CONVICTION', 880 - 46 * (1 - eo5(cu)), y, { fam: 'Cinzel', w: 600, size: 84, ls: 0.06, al: 'right', fill: whiteFill, a: A * smooth(inv(40.18, 40.6, t)), blur: 10 * (1 - eo3(cu)), glow: { c: 'rgba(0,0,0,0.5)', b: 24 } });
  drawText(g, '&', 960, y - 6, { fam: 'Cinzel', w: 400, size: 58, al: 'center', fill: '#F2D27A', a: A * smooth(inv(40.5, 40.9, t)) });
  const pu = inv(41.14, 41.86, t);
  drawText(g, 'COMPLIANCE', 1040 + 46 * (1 - eo5(pu)), y, { fam: 'Cinzel', w: 600, size: 84, ls: 0.06, al: 'left', fill: goldFill, a: A * smooth(inv(41.14, 41.56, t)), blur: 10 * (1 - eo3(pu)), glow: { c: 'rgba(0,0,0,0.5)', b: 24 } });
  // two lines meet: market signal (cyan) and Shariah line (gold)
  const lu = eio(inv(41.25, 41.9, t));
  if (lu > 0) {
    const hx = lerp(CF.x0, 960, lu);
    g.save(); g.globalAlpha = A; g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = '#2BB3EE'; g.lineWidth = 2.4; g.shadowColor = 'rgba(43,179,238,0.85)'; g.shadowBlur = 14;
    g.beginPath();
    for (let x = CF.x0; x <= hx; x += 6) {
      const k = 1 - (x - CF.x0) / (960 - CF.x0);
      const yy = CF.yB + (Math.sin(x * 0.045) * 0.6 + Math.sin(x * 0.11 + 1.3) * 0.4) * 26 * k * k;
      if (x === CF.x0) g.moveTo(x, yy); else g.lineTo(x, yy);
    }
    g.lineTo(hx, CF.yB + (Math.sin(hx * 0.045) * 0.6 + Math.sin(hx * 0.11 + 1.3) * 0.4) * 26 * Math.pow(1 - (hx - CF.x0) / (960 - CF.x0), 2));
    g.stroke();
    const gx = lerp(CF.x1, 960, lu);
    g.strokeStyle = '#F2D27A'; g.shadowColor = 'rgba(242,210,122,0.85)';
    g.beginPath(); g.moveTo(CF.x1, CF.yB); g.lineTo(gx, CF.yB); g.stroke();
    g.restore();
    for (let x = CF.x1 - 90; x > 960 + 40; x -= 135) {
      if (gx <= x) { g.save(); g.globalAlpha = A; starPath(g, x, CF.yB, 9, Math.PI / 8); g.fillStyle = '#F2D27A'; g.shadowColor = 'rgba(242,210,122,0.9)'; g.shadowBlur = 10; g.fill(); g.restore(); }
    }
    if (lu < 1) { sprite(g, GL.cyan, hx, CF.yB, 50, 50, A * 0.9); sprite(g, GL.gold, gx, CF.yB, 50, 50, A * 0.9); }
  }
  const mf = inv(41.86, 42.5, t);
  if (mf > 0 && mf < 1) { sprite(g, GL.white, 960, CF.yB, 140 * eo3(mf), 30, A * (1 - mf)); sprite(g, GL.warm, 960, CF.yB, 300, 150, A * 0.7 * (1 - mf)); }
  // the document frame binds both
  const fu = eio(inv(41.98, 42.9, t));
  if (fu > 0) {
    const gr = g.createLinearGradient(CF.x0, 0, CF.x1, 0); gr.addColorStop(0, '#2BB3EE'); gr.addColorStop(0.5, '#E9E2C8'); gr.addColorStop(1, '#F2D27A');
    g.save(); g.globalAlpha = A; g.strokeStyle = gr; g.lineWidth = 1.8; g.lineCap = 'round'; g.lineJoin = 'miter'; g.shadowColor = 'rgba(242,230,200,0.5)'; g.shadowBlur = 10;
    let ends = [];
    for (const side of [[[CF.x0, CF.yB], [CF.x0, CF.yT], [960, CF.yT]], [[CF.x1, CF.yB], [CF.x1, CF.yT], [960, CF.yT]]]) { g.beginPath(); ends.push(polyPartial(g, side, fu)); g.stroke(); }
    g.restore();
    if (fu < 1) for (const e of ends) sprite(g, GL.white, e[0], e[1], 22, 22, A * 0.9);
  }
  const su = inv(42.86, 43.2, t);
  if (su > 0) {
    g.save(); g.globalAlpha = A * smooth(su); starPath(g, 960, CF.yT, 15 * eo5(su) + 0.1, Math.PI / 8);
    g.fillStyle = '#F2D27A'; g.shadowColor = 'rgba(242,210,122,0.95)'; g.shadowBlur = 18; g.fill(); g.restore();
    if (su < 1) sprite(g, GL.gold, 960, CF.yT, 120, 120, A * (1 - su));
  }
  const du = inv(42.5, 43.3, t);
  drawText(g, 'IN THE SAME DOCUMENT', 960, 728, { fam: 'Lato', w: 400, size: 24, ls: lerp(0.8, 0.5, eo3(du)), al: 'center', fill: '#C9D5EA', a: A * smooth(du) });
}
function ov13(g, t) {
  const A = smooth(inv(47.85, 48.2, t)) * (1 - smooth(inv(49.45, 49.75, t)));
  if (A <= 0.003) return;
  const x0 = 160, x1 = 900, y = 884;
  const lu = eo3(inv(47.9, 48.75, t)), hx = lerp(x0, x1, lu);
  g.save(); g.globalAlpha = A;
  const gr = g.createLinearGradient(x0, 0, x1, 0); gr.addColorStop(0, 'rgba(201,213,234,0.8)'); gr.addColorStop(1, '#F2D27A');
  g.fillStyle = gr; g.fillRect(x0, y - 0.75, hx - x0, 1.5);
  g.restore();
  const ticks = [[x0, 'TODAY', 'left', 47.9], [530, '12 MONTHS', 'center', 48.3], [x1, '24 MONTHS', 'right', 48.72]];
  for (const [x, lab, al, tt] of ticks) {
    const ta = smooth(inv(tt, tt + 0.3, t)) * A; if (ta <= 0) continue;
    const gold = lab === '24 MONTHS';
    g.save(); g.globalAlpha = ta; g.fillStyle = gold ? '#F2D27A' : 'rgba(201,213,234,0.9)'; g.fillRect(x - 0.75, y - 8, 1.5, 16); g.restore();
    drawText(g, lab, x, y - 26, { fam: 'Lato', w: gold ? 700 : 400, size: 18, ls: 0.34, al, fill: gold ? '#F2D27A' : '#C9D5EA', a: ta, glow: { c: 'rgba(0,0,0,0.6)', b: 10 } });
  }
  sprite(g, GL.gold, hx, y, 34, 34, A * 0.95); sprite(g, GL.white, hx, y, 7, 7, A);
  const pu = inv(48.72, 49.3, t);
  if (pu > 0 && pu < 1) sprite(g, GL.gold, x1, y, 140 * eo3(pu), 140 * eo3(pu), A * 0.8 * (1 - pu));
}
function ov14(g, t) {
  const out = 1 - smooth(inv(53.95, 54.5, t));
  const u1 = inv(50.32, 51.9, t);
  drawText(g, 'KNOWLEDGE, AMPLIFIED.', 960, 300, {
    fam: 'Cinzel', w: 500, size: 74, ls: lerp(0.55, 0.15, eo5(u1)), al: 'center', fill: champFill,
    a: out * smooth(inv(50.32, 50.95, t)), blur: 16 * (1 - eo3(inv(50.32, 51.25, t))) + 6 * (1 - out), glow: { c: 'rgba(0,6,18,0.7)', b: 34 },
  });
  const u2 = inv(52.48, 52.86, t);
  drawText(g, 'DECISIONS, SHARPENED.', 960, 410, {
    fam: 'Cinzel', w: 600, size: 74, ls: lerp(0.3, 0.15, eo5(u2)), al: 'center', fill: whiteFill,
    a: out * smooth(inv(52.48, 52.62, t)), blur: 22 * (1 - eo5(u2)) + 6 * (1 - out), glow: { c: 'rgba(0,6,18,0.7)', b: 34 },
  });
  const sw = inv(52.8, 53.5, t);
  if (sw > 0 && sw < 1) shine(g, t, sw, () => drawText(x1, 'DECISIONS, SHARPENED.', 960, 410, { fam: 'Cinzel', w: 600, size: 74, ls: 0.15, al: 'center', fill: '#fff' }), 380, 0.55 * out);
}
function shine(g, t, u, drawMask, ycen, amt) {
  x1.save(); x1.setTransform(1, 0, 0, 1, 0, 0); x1.globalCompositeOperation = 'source-over'; x1.clearRect(0, 0, W, H);
  drawMask();
  x1.globalCompositeOperation = 'source-in';
  const p = lerp(300, 1650, u);
  const gr = x1.createLinearGradient(p - 160, ycen - 60, p + 160, ycen + 60);
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,250,235,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  x1.fillStyle = gr; x1.fillRect(0, 0, W, H); x1.restore();
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = amt; g.drawImage(X1, 0, 0); g.restore();
}
function wordmark(g, y, o, a, blur) {
  const w1 = measureW(g, 'BARAKA ', o), w2 = textWidth(g, 'INVEST', o);
  const x0 = 960 - (w1 + w2) / 2;
  drawText(g, 'BARAKA', x0, y, { ...o, fill: o.fill1 || '#FFFFFF', a, blur });
  drawText(g, 'INVEST', x0 + w1, y, { ...o, fill: o.fill2 || '#2BB3EE', a, blur });
}
function ov15(g, t) {
  const z = groupZoom(t);
  g.save(); g.translate(960, 540); g.scale(z, z); g.translate(-960, -540);
  const gold = LOGO.strokes.find(s => s.gold);
  if (gold) {
    const gu = inv(56.12, 57.1, t);
    if (gu > 0 && gu < 1) {
      const gx = MX0 + (gold.x + gold.w * 0.62) * MS, gy = MY0 + (gold.y + gold.h / 2) * MS;
      sprite(g, GL.gold, gx, gy, 520 * eo3(gu) + 40, 140 * eo3(gu) + 20, 0.75 * (1 - gu));
      sprite(g, GL.white, gx, gy, 260, 10, 0.5 * (1 - gu));
    }
  }
  const u = inv(56.28, 57.5, t);
  const o = { fam: 'Cinzel', w: 600, size: 76, ls: lerp(0.46, 0.12, eo5(u)) };
  wordmark(g, 690, o, smooth(inv(56.28, 56.9, t)), 10 * (1 - eo3(inv(56.28, 57.1, t))));
  const sw = inv(57.6, 58.35, t);
  if (sw > 0 && sw < 1) {
    shine(g, t, sw, () => { wordmark(x1, 690, { ...o, ls: 0.12, fill1: '#fff', fill2: '#fff' }, 1, 0); for (const st of LOGO.strokes) x1.drawImage(st.c, MX0 + st.x * MS, MY0 + st.y * MS, st.w * MS, st.h * MS); }, 520, 0.5);
  }
  const ru = eo3(inv(58.25, 58.9, t));
  if (ru > 0) { g.save(); g.fillStyle = '#F2D27A'; g.globalAlpha = 0.9; g.fillRect(960 - 60 * ru, 734, 120 * ru, 1.5); g.restore(); }
  const tu = inv(58.55, 59.9, t);
  if (tu > 0) {
    const tg = 'INTELLIGENCE, BEFORE IT’S OBVIOUS.';
    const to = { fam: 'Lato', w: 300, size: 27, ls: 0.4, al: 'center', fill: '#D5DFEE' };
    x2.save(); x2.setTransform(1, 0, 0, 1, 0, 0); x2.clearRect(0, 0, W, H); drawText(x2, tg, 960, 790, to);
    x2.globalCompositeOperation = 'destination-in';
    const tw = textWidth(x2, tg, to), p = lerp(960 - tw / 2 - 120, 960 + tw / 2 + 120, eio(tu));
    const gr = x2.createLinearGradient(p - 120, 0, p + 120, 0); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    x2.fillStyle = gr; x2.fillRect(0, 700, W, 140); x2.restore();
    g.drawImage(X2, 0, 0);
  }
  g.restore();
  drawText(g, 'Research, not investment advice.', 960, 1012, { fam: 'Lato', w: 400, size: 16, ls: 0.08, al: 'center', fill: '#7F90AE', a: smooth(inv(59.6, 60.3, t)) });
}
const FLASH = [
  { tp: 6.0, r: 0.45, f: 0.7, p: 0.95, c: [225, 244, 255] },
  { tp: 12.04, r: 0.001, f: 0.09, p: 0.32, c: [255, 255, 255] },
  { tp: 12.625, r: 0.001, f: 0.09, p: 0.26, c: [255, 255, 255] },
  { tp: 13.08, r: 0.001, f: 0.09, p: 0.26, c: [255, 255, 255] },
  { tp: 24.58, r: 0.34, f: 0.85, p: 0.9, c: [255, 236, 205] },
  { tp: 49.66, r: 0.17, f: 0.45, p: 0.42, c: [255, 220, 175] },
  { tp: 56.16, r: 0.04, f: 0.7, p: 0.5, c: [255, 222, 150], local: [960, 395, 760, 420] },
];
function flashAmt(t, F) {
  if (t < F.tp - F.r || t > F.tp + F.f) return 0;
  if (t < F.tp) return F.p * Math.pow(inv(F.tp - F.r, F.tp, t), 2);
  return F.p * Math.pow(1 - inv(F.tp, F.tp + F.f, t), 2.2);
}
function flashes(g, t) {
  let tot = 0;
  for (const F of FLASH) {
    const a = flashAmt(t, F); if (a <= 0.002) continue; tot += a;
    if (F.local) { sprite(g, GL.warm, F.local[0], F.local[1], F.local[2], F.local[3], a); continue; }
    g.save(); g.globalCompositeOperation = 'lighter';
    g.fillStyle = `rgba(${F.c[0]},${F.c[1]},${F.c[2]},${(a * 0.7).toFixed(4)})`; g.fillRect(0, 0, W, H);
    g.globalAlpha = Math.min(1, a * 0.9); g.drawImage(GL.white, W / 2 - 1150, H / 2 - 900, 2300, 1800);
    g.restore();
  }
  return tot;
}
function overlay(g, t) {
  if (t >= 6.9 && t < 8.79) counter(g, t, 6.95, 7.40, 40, '+', 'MARKETS');
  if (t >= 8.79 && t < 10.18) counter(g, t, 8.84, 9.16, 11, '', 'SECTORS');
  if (t >= 10.18 && t < 11.58) counter(g, t, 10.23, 10.58, 60, '+', 'INDUSTRIES');
  if (t >= 25.2 && t < 30.45) ov09(g, t);
  if (t >= 30.4 && t < 33.8) ov10(g, t);
  if (t >= 33.95 && t < 39.62) ov11(g, t);
  if (t >= 39.45 && t < 43.8) ov12(g, t);
  if (t >= 47.8 && t < 49.8) ov13(g, t);
  if (t >= 50.25 && t < 54.55) ov14(g, t);
  if (t >= 55.8) ov15(g, t);
  return flashes(g, t);
}

// ---------- post ----------
function post(f, t, fl) {
  ox.save(); ox.globalCompositeOperation = 'copy'; ox.filter = 'contrast(1.05) saturate(1.06)'; ox.drawImage(MAIN, 0, 0); ox.restore();
  const ba = 0.24 + 0.25 * Math.min(1, fl);
  b1x.clearRect(0, 0, 480, 270); b1x.filter = 'brightness(0.82) contrast(2.3) blur(3px)'; b1x.drawImage(MAIN, 0, 0, 480, 270); b1x.filter = 'none';
  b2x.clearRect(0, 0, 240, 135); b2x.filter = 'blur(6px)'; b2x.drawImage(B1, 0, 0, 240, 135); b2x.filter = 'none';
  ox.save(); ox.globalCompositeOperation = 'screen';
  ox.globalAlpha = ba; ox.drawImage(B1, 0, 0, W, H);
  ox.globalAlpha = ba * 0.9; ox.drawImage(B2, 0, 0, W, H);
  ox.restore();
  ox.drawImage(VIG, 0, 0);
  const r = rng(f * 9973 + 17);
  ox.save(); ox.globalCompositeOperation = 'overlay'; ox.globalAlpha = 0.06;
  ox.drawImage(GRAIN[f % GRAIN.length], -Math.floor(r() * 120), -Math.floor(r() * 120)); ox.restore();
  const fb = smooth(inv(62.6, 63.7, t)) + (t < 0.05 ? 1 : 0);
  if (fb > 0) { ox.save(); ox.fillStyle = `rgba(0,0,0,${Math.min(1, fb)})`; ox.fillRect(0, 0, W, H); ox.restore(); }
}

function renderAt(f) {
  const t = f / FPS, n = samplesAt(t), span = 0.5 / FPS;
  if (n <= 1) { mx.save(); scene(mx, t); mx.restore(); }
  else {
    for (let i = 0; i < n; i++) {
      const tt = t + span * ((i + 0.5) / n - 0.5);
      sx.save(); scene(sx, tt); sx.restore();
      mx.save(); mx.globalCompositeOperation = 'source-over'; mx.globalAlpha = 1 / (i + 1); mx.drawImage(SMP, 0, 0); mx.restore();
    }
  }
  mx.save(); const fl = overlay(mx, t); mx.restore();
  post(f, t, fl);
}
window.renderFrame = (f, q = 0.95) => { renderAt(f); return OUT.toDataURL('image/jpeg', q); };
window.NF = NF;
load().catch(e => { window.LOAD_ERROR = String(e && e.stack || e); });
