// Renders index.html frame-by-frame with headless Chromium and encodes an MP4.
// Usage: node render.mjs [--fps 30] [--out out/probuca-nouvelle-specialiste.mp4] [--frames a:b] [--stills 1,8,16]
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { spawn, execSync } from 'node:child_process';
import path from 'node:path';

const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d; };
const FPS = +arg('fps', 30);
const OUT = arg('out', 'out/probuca-nouvelle-specialiste.mp4');
const STILLS = arg('stills');
const ROOT = path.resolve('.');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.png': 'image/png' };

const server = createServer(async (req, res) => {
  try {
    const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
    res.end(await readFile(p));
  } catch { res.writeHead(404); res.end(); }
}).listen(0);
const port = server.address().port;

const ffmpegBin = process.env.FFMPEG || execSync(`python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"`).toString().trim();

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('console', (m) => m.type() === 'error' && console.error('[page]', m.text()));
page.on('pageerror', (e) => console.error('[page]', e));
await page.goto(`http://localhost:${port}/index.html?render`);
await page.waitForFunction(() => window.renderAt);
await mkdir('out', { recursive: true });

if (STILLS) {
  for (const t of STILLS.split(',').map(Number)) {
    await page.evaluate((t) => window.renderAt(t), t);
    await page.screenshot({ path: `out/still-${t}.jpg`, type: 'jpeg', quality: 90 });
    console.log('still', t);
  }
} else {
  const total = Math.round((await page.evaluate(() => window.DURATION)) * FPS);
  const [a, b] = (arg('frames', `0:${total}`)).split(':').map(Number);
  const ff = spawn(ffmpegBin, ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT],
    { stdio: ['pipe', 'ignore', 'inherit'] });
  const t0 = Date.now();
  for (let f = a; f < b; f++) {
    await page.evaluate((t) => window.renderAt(t), f / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (f % 30 === 0) console.log(`frame ${f}/${b}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  console.log('wrote', OUT);
}
await browser.close();
server.close();
