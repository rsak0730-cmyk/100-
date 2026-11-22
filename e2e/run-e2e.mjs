/**
 * AETHER — end-to-end browser test (real Chromium via playwright-core +
 * @sparticuz/chromium, software WebGL via SwiftShader).
 *
 * Usage:  node e2e/run-e2e.mjs
 * Outputs: e2e/screenshots/*.png, e2e/report.json
 *
 * No network access is required beyond localhost.
 */
import { spawn, execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import zlib from 'node:zlib';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SHOTS = path.join(ROOT, 'e2e', 'screenshots');
const PORT = 4173;
const BASE = `http://127.0.0.1:${PORT}/`;
mkdirSync(SHOTS, { recursive: true });

const results = [];
const consoleErrors = [];
const pageErrors = [];
let failures = 0;

function record(name, ok, detail = '') {
  results.push({ name, ok, detail });
  const icon = ok ? 'PASS' : 'FAIL';
  console.log(`  [${icon}] ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failures++;
}

function step(title) {
  console.log(`\n▶ ${title}`);
}

/* ───────────────────────── PNG blank-frame analysis ───────────────────────── */
function analyzePNG(buffer) {
  // Minimal decoder: 8-bit RGB(A), non-interlaced (Chromium screenshots)
  if (buffer.readUInt32BE(0) !== 0x89504e47) throw new Error('not a png');
  let offset = 8;
  let width = 0, height = 0, bitDepth = 0, colorType = 0;
  const idat = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      bitDepth = data[8]; colorType = data[9];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    offset += 12 + length;
  }
  if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6)) {
    return { width, height, mean: -1, stddev: -1, note: `unsupported colortype ${colorType} depth ${bitDepth}` };
  }
  const bpp = colorType === 6 ? 4 : 3;
  const stride = width * bpp;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const out = Buffer.alloc(height * stride);
  let prev = Buffer.alloc(stride);
  let r = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[r++];
    const line = raw.subarray(r, r + stride); r += stride;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0;
      const b = prev[x];
      const c = x >= bpp ? prev[x - bpp] : 0;
      let v = line[x];
      switch (filter) {
        case 1: v = (v + a) & 255; break;
        case 2: v = (v + b) & 255; break;
        case 3: v = (v + ((a + b) >> 1)) & 255; break;
        case 4: {
          const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
          v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255; break;
        }
        default: break;
      }
      cur[x] = v;
    }
    prev = cur;
  }
  let sum = 0, sum2 = 0, n = 0, colored = 0;
  for (let i = 0; i + 2 < out.length; i += bpp) {
    const lum = 0.2126 * out[i] + 0.7152 * out[i + 1] + 0.0722 * out[i + 2];
    sum += lum; sum2 += lum * lum; n++;
    if (Math.abs(out[i] - out[i + 1]) + Math.abs(out[i + 1] - out[i + 2]) > 24) colored++;
  }
  const mean = sum / n;
  const stddev = Math.sqrt(Math.max(0, sum2 / n - mean * mean));
  return { width, height, mean: +mean.toFixed(2), stddev: +stddev.toFixed(2), colorRatio: +(colored / n).toFixed(4) };
}

/* ───────────────────────── chromium extraction ───────────────────────── */
function ensureAl2023Libs() {
  const marker = '/tmp/al2023/lib/libnss3.so';
  if (existsSync(marker)) return '/tmp/al2023/lib';
  console.log('  · extracting AL2023 shared libraries for chromium…');
  const pkgBin = path.join(ROOT, 'node_modules', '@sparticuz', 'chromium', 'bin');
  const tarPath = '/tmp/al2023.tar';
  execSync(
    `node -e "const z=require('zlib'),fs=require('fs');fs.createReadStream('${path.join(pkgBin, 'al2023.tar.br')}').pipe(z.createBrotliDecompress()).pipe(fs.createWriteStream('${tarPath}')).on('finish',()=>process.exit(0))"`,
    { stdio: 'inherit' }
  );
  mkdirSync('/tmp/al2023', { recursive: true });
  execSync(`tar -xf ${tarPath} -C /tmp/al2023`);
  if (!existsSync(marker)) throw new Error('failed to extract al2023 chromium libraries');
  return '/tmp/al2023/lib';
}

/* ───────────────────────── vite preview server ───────────────────────── */
function startPreview() {
  const child = spawn('npm', ['run', 'preview', '--', '--port', String(PORT), '--strictPort'], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env },
  });
  child.stderr.on('data', (d) => process.stderr.write(`  [preview] ${d}`));
  return child;
}

async function waitForServer(timeoutMs = 45000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(BASE, { method: 'HEAD' });
      if (res.ok) return;
    } catch { /* retry */ }
    await new Promise((r) => setTimeout(r, 350));
  }
  throw new Error(`preview server did not start within ${timeoutMs}ms`);
}

/* ───────────────────────── test suite ───────────────────────── */
const screenshots = [];

async function snap(page, name) {
  const file = path.join(SHOTS, `${name}.png`);
  const buf = await page.screenshot({ path: file, type: 'png' });
  const stats = analyzePNG(buf);
  screenshots.push({ name, file: path.relative(ROOT, file), ...stats });
  return stats;
}

async function main() {
  console.log('AETHER e2e — starting');
  const libDir = ensureAl2023Libs();
  process.env.LD_LIBRARY_PATH = `${libDir}:${process.env.LD_LIBRARY_PATH ?? ''}`;

  // Ensure a fresh production build exists
  if (!existsSync(path.join(ROOT, 'dist', 'index.html'))) {
    console.log('  · dist/ missing — building…');
    execSync('npm run build', { cwd: ROOT, stdio: 'inherit' });
  }

  const preview = startPreview();
  await waitForServer();
  console.log('  · preview server is up');

  const chromium = require('@sparticuz/chromium');
  const { chromium: pw } = require('playwright-core');

  let browser;
  try {
    // Fake capture devices let us exercise the microphone path headlessly.
    const launchBrowser = async () => {
      const b = await pw.launch({
        executablePath: await chromium.executablePath(),
        args: [...chromium.args, '--no-sandbox', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
        headless: true,
        env: { ...process.env, LD_LIBRARY_PATH: `${libDir}:${process.env.LD_LIBRARY_PATH ?? ''}` },
      });
      b.on('disconnected', () => console.error('  ! browser disconnected (crashed or killed)'));
      return b;
    };
    browser = await launchBrowser();

    const context = await browser.newContext({
      viewport: { width: 1600, height: 900 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => pageErrors.push(String(err)));
    page.on('requestfailed', (req) => {
      const url = req.url();
      if (!url.startsWith('data:')) consoleErrors.push(`requestfailed: ${url} — ${req.failure()?.errorText}`);
    });

    /* ── 1. Landing ── */
    step('Landing page');
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForSelector('#enterLab', { timeout: 10000 });
    record('landing renders', await page.isVisible('#enterLab') && await page.isVisible('.landing__title'));
    const landingStats = await snap(page, 'landing');
    record('landing not blank', landingStats.stddev > 3, `stddev=${landingStats.stddev}`);

    /* ── 2. Enter the lab ── */
    step('Enter lab → WebGL stage');
    await page.click('#enterLab');
    await page.waitForFunction(() => window.__aether !== undefined, null, { timeout: 10000 });
    await page.waitForTimeout(1800); // let the galaxy settle + first frames render
    const boot = await page.evaluate(() => {
      const s = window.__aether.getStats();
      return { fps: s.fps, renderer: s.renderer, effectId: s.effectId, particles: s.particles, gpu: s.gpu, simMode: s.simMode };
    });
    record('engine booted', typeof boot.fps === 'number' && boot.fps > 0, `fps=${boot.fps}`);
    record('WebGL2 renderer', /WebGL2/.test(boot.renderer), boot.renderer);
    record('default effect is galaxy', boot.effectId === 'galaxy', boot.effectId);
    record('particle population active', boot.particles >= 500, `particles=${boot.particles}`);

    /* ── 3. All effects render non-blank frames ── */
    step('Effect gallery — switch all 10 simulations');
    const effectIds = await page.evaluate(() => window.__aether.effectIds);
    record('catalog exposes 10 effects', effectIds.length === 10, effectIds.join(','));

    // Switch one effect through the real UI button
    await page.click('[data-effect="blackhole"]');
    await page.waitForTimeout(1200);
    const uiSwitch = await page.evaluate(() => window.__aether.getEffectId());
    record('UI effect switch (blackhole card)', uiSwitch === 'blackhole', uiSwitch);

    for (const id of effectIds) {
      await page.evaluate((effect) => window.__aether.setEffect(effect), id);
      await page.waitForTimeout(1100);
      const shot = await snap(page, `effect-${id}`);
      const ok = shot.stddev > 2.2 && shot.mean > 1.2;
      record(`effect "${id}" renders content`, ok, `mean=${shot.mean} stddev=${shot.stddev}`);
    }

    /* ── 4. Canvas interactions ── */
    step('Interaction — click burst, drag attraction, wheel zoom');
    await page.evaluate(() => window.__aether.setEffect('explosion'));
    await page.waitForTimeout(700);
    const box = await page.locator('#stage canvas').boundingBox();
    const cx = box.x + box.width * 0.5, cy = box.y + box.height * 0.48;
    await page.mouse.click(cx, cy);           // detonate
    await page.waitForTimeout(350);
    await page.mouse.move(cx - 220, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 180, cy - 60, { steps: 24 });
    await page.mouse.up();
    await page.mouse.wheel(0, -420);          // zoom in
    await page.waitForTimeout(400);
    record('canvas interactions produced no page errors', pageErrors.length === 0, `${pageErrors.length} page errors`);

    /* ── 5. Controls drive the simulation ── */
    step('Control deck — sliders, palette, quality, pause, reset');
    const sliderKeys = ['particleCount', 'particleSize', 'speed', 'gravity', 'attraction', 'repulsion',
      'turbulence', 'rotation', 'opacity', 'glow', 'bloom', 'trail'];
    let slidersOk = true;
    for (const key of sliderKeys) {
      if (!(await page.$(`#slider-${key}`))) slidersOk = false;
    }
    record('all 12 parameter sliders present', slidersOk);

    // particleCount applies on change; drive it through the store API + verify
    await page.evaluate(() => window.__aether.updateSettings({ particleCount: 1500 }));
    await page.waitForTimeout(400);
    let stats = await page.evaluate(() => window.__aether.getStats());
    record('particle count setting applied', stats.particles === 1500, `particles=${stats.particles}`);
    await page.evaluate(() => window.__aether.updateSettings({ particleCount: 6500 }));
    await page.waitForTimeout(300);

    // Glow slider via real DOM input event
    await page.evaluate(() => {
      const input = document.querySelector('#slider-glow');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, '1.8');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const glow = await page.evaluate(() => window.__aether.getSettings().glow);
    record('glow slider updates store', Math.abs(glow - 1.8) < 1e-6, `glow=${glow}`);

    // Palette switch to inferno via swatch click
    await page.click('[data-palette="inferno"]');
    const palette = await page.evaluate(() => window.__aether.getSettings().palette);
    record('palette swatch switches palette', palette === 'inferno', palette);

    // Quality preset ultra via segmented control
    await page.click('[data-quality="ultra"]');
    const quality = await page.evaluate(() => window.__aether.getSettings().quality);
    record('quality segmented control works', quality === 'ultra', quality);
    await page.click('[data-quality="balanced"]');

    // Pause / resume through the actual button
    await page.click('#pauseBtn');
    const pausedAfterClick = await page.evaluate(() => window.__aether.getStats().paused);
    await page.click('#pauseBtn');
    const resumedAfterClick = await page.evaluate(() => window.__aether.getStats().paused);
    record('pause/resume button toggles simulation', pausedAfterClick === true && resumedAfterClick === false);

    // Restart
    await page.click('#restartBtn');
    await page.waitForTimeout(300);
    record('restart button runs without errors', pageErrors.length === 0);

    // Reset camera
    await page.click('#resetCameraBtn');
    record('reset camera button works', pageErrors.length === 0);

    // Reset settings modal flow (intercept confirm)
    await page.click('#resetSettingsBtn');
    await page.waitForSelector('#confirmModal:not([hidden])', { timeout: 3000 });
    await page.click('#confirmReset');
    await page.waitForTimeout(400);
    const paletteAfterReset = await page.evaluate(() => window.__aether.getSettings().palette);
    const countAfterReset = await page.evaluate(() => window.__aether.getSettings().particleCount);
    record('reset settings restores defaults', paletteAfterReset === 'nebula' && countAfterReset === 6500,
      `palette=${paletteAfterReset} count=${countAfterReset}`);

    /* ── 6. Audio: demo signal + fake microphone ── */
    step('Audio reactive — demo signal & microphone permission path');
    await page.evaluate(() => window.__aether.setEffect('audio'));
    await page.waitForTimeout(900);
    const demoMode = await page.evaluate(() => window.__aether.getAudioMode());
    record('audio defaults to demo signal', demoMode === 'demo', demoMode);

    await page.click('#micBtn');
    await page.waitForTimeout(1500);
    const micMode = await page.evaluate(() => window.__aether.getAudioMode());
    const micActive = await page.$eval('#micBtn', (el) => el.classList.contains('is-active'));
    record('microphone enable path works (fake device)', micMode === 'microphone' && micActive, `mode=${micMode}`);
    await page.click('#demoAudioBtn'); // back to demo
    await page.waitForTimeout(400);
    const backToDemo = await page.evaluate(() => window.__aether.getAudioMode());
    record('switching back to demo signal', backToDemo === 'demo', backToDemo);

    /* ── 7. Performance sampling (software GL — informational + sanity floor) ── */
    step('Performance sampling');
    await page.evaluate(() => window.__aether.setEffect('galaxy'));
    await page.evaluate(() => window.__aether.updateSettings({ particleCount: 6500 }));
    await page.waitForTimeout(2500);
    const perf = await page.evaluate(() => window.__aether.getStats());
    console.log(`  · fps=${perf.fps} frameMs=${perf.frameMs} particles=${perf.particles} drawCalls=${perf.drawCalls} gpu=${perf.gpu}`);
    record('fps above sanity floor (≥ 8 under SwiftShader)', perf.fps >= 8, `fps=${perf.fps}`);
    record('draw calls bounded', perf.drawCalls <= 24, `drawCalls=${perf.drawCalls}`);

    /* ── 8. Mobile viewport ── */
    step('Mobile viewport 390×844');
    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    mobile.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(`[mobile] ${msg.text()}`); });
    mobile.on('pageerror', (err) => pageErrors.push(`[mobile] ${err}`));
    await mobile.goto(BASE, { waitUntil: 'networkidle' });
    await mobile.click('#enterLab');
    await mobile.waitForTimeout(1500);
    const mobileShot = await snap(mobile, 'mobile-galaxy');
    record('mobile canvas renders content', mobileShot.stddev > 2.2, `stddev=${mobileShot.stddev}`);
    const mobileStatsVisible = await mobile.evaluate(() => {
      const el = document.getElementById('statsRail');
      return el ? getComputedStyle(el).display !== 'none' : false;
    });
    record('mobile telemetry rail visible', mobileStatsVisible);
    await mobile.click('#panelToggle');
    await mobile.waitForTimeout(300);
    const panelState = await mobile.$eval('#panel', (el) => el.classList.contains('panel--collapsed'));
    record('mobile panel collapse toggle works', panelState === true);
    await mobile.close();

    /* ── 9. Rapid-switch regression + reload (fresh browser — the software
         GL single-process build accumulates memory; isolate this phase) ── */
    step('Regression — rapid switching & reload');
    try { await browser.close(); } catch { /* ignore */ }
    browser = await launchBrowser();
    const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page2 = await ctx2.newPage();
    page2.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(`[regression] ${msg.text()}`); });
    page2.on('pageerror', (err) => pageErrors.push(`[regression] ${err}`));
    await page2.goto(BASE, { waitUntil: 'networkidle' });
    await page2.click('#enterLab');
    await page2.waitForFunction(() => window.__aether !== undefined, null, { timeout: 10000 });
    await page2.evaluate(() => window.__aether.updateSettings({ particleCount: 3000 }));
    await page2.waitForTimeout(800);
    for (const id of ['explosion', 'wave', 'dna', 'nebula', 'blackhole']) {
      await page2.evaluate((effect) => window.__aether.setEffect(effect), id);
      await page2.waitForTimeout(320);
    }
    await page2.waitForTimeout(900);
    const regressionErrors = pageErrors.filter((e) => e.startsWith('[regression]')).length;
    record('rapid effect switching survives', regressionErrors === 0, `${regressionErrors} page errors`);

    await page2.goto(BASE, { waitUntil: 'networkidle' });   // full reload
    await page2.click('#enterLab');
    await page2.waitForTimeout(1200);
    const reloadErrors = pageErrors.filter((e) => e.startsWith('[regression]')).length;
    record('page reload boots cleanly', reloadErrors === 0, `${reloadErrors} page errors`);

    const fullShot = await snap(page2, 'final-stage');
    record('final stage renders content', fullShot.stddev > 2.2, `stddev=${fullShot.stddev}`);
    await ctx2.close();

    /* ── Console error sweep ── */
    step('Console error sweep');
    const filtered = consoleErrors.filter((e) => !/favicon|GPU stall|swiftshader|Automatic fallback/i.test(e));
    record('no console errors', filtered.length === 0, filtered.slice(0, 4).join(' || '));
    record('no page errors', pageErrors.length === 0, pageErrors.slice(0, 4).join(' || '));

    await browser.close();
  } catch (err) {
    record('e2e harness completed', false, String(err?.stack ?? err));
    failures++;
    try { await browser?.close(); } catch { /* already closed */ }
  } finally {
    preview.kill('SIGTERM');
  }

  const report = {
    date: new Date().toISOString(),
    failures,
    passed: results.filter((r) => r.ok).length,
    total: results.length,
    screenshots,
    consoleErrors,
    pageErrors,
    results,
  };
  writeFileSync(path.join(ROOT, 'e2e', 'report.json'), JSON.stringify(report, null, 2));
  console.log(`\n${'═'.repeat(64)}`);
  console.log(`AETHER e2e: ${report.passed}/${report.total} checks passed · ${failures} failure(s)`);
  console.log(`screenshots → e2e/screenshots/ · report → e2e/report.json`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
