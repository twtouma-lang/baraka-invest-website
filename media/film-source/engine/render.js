// Usage: node render.js <outDir> <frameSpec> [worker index] [worker count]
//   frameSpec: "a:b" (range, b exclusive) or "f1,f2,..." or "t=1.5,5.8" (times in seconds)
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

function serve() {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { rsp.writeHead(404); rsp.end(); return; }
      rsp.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
      fs.createReadStream(p).pipe(rsp);
    });
    srv.listen(0, '127.0.0.1', () => res(srv));
  });
}

function parseSpec(spec) {
  if (spec.startsWith('t=')) return spec.slice(2).split(',').map(x => Math.round(parseFloat(x) * 24));
  if (spec.includes(':')) { const [a, b] = spec.split(':').map(Number); return Array.from({ length: b - a }, (_, i) => a + i); }
  return spec.split(',').map(Number);
}

(async () => {
  const [outDir, spec, wi = '0', wn = '1'] = process.argv.slice(2);
  fs.mkdirSync(outDir, { recursive: true });
  const frames = parseSpec(spec).filter((f, i) => i % Number(wn) === Number(wi));
  const srv = await serve();
  const url = `http://127.0.0.1:${srv.address().port}/index.html`;
  const browser = await chromium.launch({ args: (process.env.CHROME_ARGS || '').split(' ').filter(Boolean) });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('console', m => { if (m.type() === 'error') console.error('[page]', m.text()); });
  page.on('pageerror', e => console.error('[pageerror]', e.message));
  await page.goto(url);
  const t0 = Date.now();
  await page.waitForFunction(() => window.READY === true || window.LOAD_ERROR, null, { timeout: 180000 });
  const err = await page.evaluate(() => window.LOAD_ERROR);
  if (err) { console.error('LOAD_ERROR', err); process.exit(2); }
  console.error(`worker ${wi}: ready in ${Date.now() - t0} ms, ${frames.length} frames`);
  const t1 = Date.now();
  let n = 0;
  for (const f of frames) {
    const b64 = await page.evaluate(f => window.renderFrame(f, 0.95), f);
    fs.writeFileSync(path.join(outDir, `f${String(f).padStart(5, '0')}.jpg`), Buffer.from(b64.slice(b64.indexOf(',') + 1), 'base64'));
    n++;
    if (n % 50 === 0) console.error(`worker ${wi}: ${n}/${frames.length} (${((Date.now() - t1) / n).toFixed(0)} ms/frame)`);
  }
  console.error(`worker ${wi}: done ${n} frames, ${((Date.now() - t1) / Math.max(1, n)).toFixed(0)} ms/frame`);
  await browser.close();
  srv.close();
})().catch(e => { console.error(e); process.exit(1); });
