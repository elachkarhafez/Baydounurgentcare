// Render brand posts from one posts.html.
//   node render.mjs <posts.html> <outdir> [--stills] [--video] [--only p1,p3] [--fps 30] [--music <mp3>|none] [--preview]
// Contract inside posts.html (see template.html):
//   every post: <div class="post" data-post id="p1" style="width:1080px;height:1350px"> … </div>
//   animated posts register a PAUSED gsap timeline:  TL.p1 = gsap.timeline({ paused: true }) …
//   optional sound cues:                               CUES.p1 = [[0.4, 'pop', .8], [1.2, 'whoosh', .6]]   (t seconds, name in kit/snd or a path, gain)
// Stills are taken at the END of each post's timeline (its finished state). Videos step the timeline frame by frame,
// so motion is perfectly smooth whatever the machine speed. Writes <id>.png, <id>.mp4, sheet.jpg (all stills) and
// <id>-frames.jpg (a contact strip of each video, for checking).
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { execFileSync, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const KIT = path.dirname(new URL(import.meta.url).pathname);
const args = process.argv.slice(2);
const [HTML, OUT] = args;
const flag = n => args.includes('--' + n), opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const FPS = +opt('fps', 30), ONLY = opt('only', '') ? opt('only').split(',') : null, MUSIC = opt('music', path.join(KIT, 'snd/loop.mp3'));
const doStills = flag('stills') || !flag('video'), doVideo = flag('video') || !flag('stills'), PREVIEW = flag('preview');
if (!HTML || !OUT) { console.log('usage: node render.mjs <posts.html> <outdir> [--stills] [--video] [--only p1,p2] [--music file|none] [--preview]'); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });

const cache = {};
const curl = u => cache[u] || (cache[u] = execFileSync('curl', ['-sL', '--max-time', '30', '-A', 'Mozilla/5.0 Chrome/128', u], { maxBuffer: 2e8 }));
const ctype = u => /\.css|css2\?/.test(u) ? 'text/css' : /\.js(\?|$)/.test(u) ? 'application/javascript' : /woff2/.test(u) ? 'font/woff2' : /\.woff/.test(u) ? 'font/woff' : /\.png/.test(u) ? 'image/png' : /\.jpe?g/.test(u) ? 'image/jpeg' : /\.webp/.test(u) ? 'image/webp' : /\.svg/.test(u) ? 'image/svg+xml' : 'application/octet-stream';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await b.newPage({ viewport: { width: 1200, height: 2000 }, deviceScaleFactor: 1 });
const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
// fonts, gsap and remote images come through curl (the sandbox proxy blocks the browser's own fetches)
await page.route(/^https:\/\//, r => { const u = r.request().url(); try { r.fulfill({ body: curl(u), contentType: ctype(u), headers: { 'access-control-allow-origin': '*' } }); } catch (e) { r.abort(); } });
await page.goto('file://' + path.resolve(HTML), { waitUntil: 'load' });
await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i => i.decode().catch(() => {}))); });
await page.waitForTimeout(300);
// TL / CUES may be top-level consts (not window properties): expose them
await page.evaluate(() => { try { window.__TL = TL; } catch (e) { window.__TL = window.TL || {}; } try { window.__CUES = CUES; } catch (e) { window.__CUES = window.CUES || {}; } });
const posts = (await page.evaluate(() => [...document.querySelectorAll('[data-post]')].map(e => ({ id: e.id, w: e.offsetWidth, h: e.offsetHeight, anim: !!window.__TL[e.id], dur: window.__TL[e.id] ? window.__TL[e.id].duration() : 0, cues: window.__CUES[e.id] || [] }))))
  .filter(p => !ONLY || ONLY.includes(p.id));
if (!posts.length) { console.log('no [data-post] elements found'); process.exit(1); }
const seek = (id, t) => page.evaluate(([id, t]) => { if (window.__TL[id]) window.__TL[id].seek(t, false); }, [id, t]);
const solo = id => page.evaluate(id => { document.body.classList.add('solo'); document.querySelectorAll('[data-post]').forEach(e => { e.style.display = e.id === id ? '' : 'none'; }); window.scrollTo(0, 0); }, id);
const unsolo = () => page.evaluate(() => { document.body.classList.remove('solo'); document.querySelectorAll('[data-post]').forEach(e => { e.style.display = ''; }); });

if (doStills) {
  for (const p of posts) { await seek(p.id, p.dur); await (await page.$('#' + p.id)).screenshot({ path: `${OUT}/${p.id}.png` }); }
  const list = posts.map(p => `${OUT}/${p.id}.png`);
  execFileSync('python3', ['-c', `import sys
from PIL import Image
fs=sys.argv[1:]; ims=[Image.open(f).convert('RGB') for f in fs]; W=360; cols=min(4,len(ims)); rows=(len(ims)+cols-1)//cols
hs=[int(W*i.height/i.width) for i in ims]; H=max(hs)
s=Image.new('RGB',(cols*(W+10)+10,rows*(H+10)+10),'white')
for k,i in enumerate(ims): s.paste(i.resize((W,hs[k])),(10+k%cols*(W+10),10+k//cols*(H+10)))
s.save('${OUT}/sheet.jpg',quality=86)`, ...list]);
  console.log('stills:', posts.map(p => p.id).join(' '), '->', `${OUT}/sheet.jpg`);
}

if (doVideo) {
  for (const p of posts.filter(p => p.anim)) {
    await solo(p.id);
    await page.setViewportSize({ width: p.w, height: p.h });
    const dir = `${OUT}/.frames-${p.id}`; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
    const n = Math.round(p.dur * FPS), step = PREVIEW ? Math.max(1, Math.round(n / 15)) : 1;
    const el = await page.$('#' + p.id);
    for (let i = 0; i <= n; i += step) { await seek(p.id, i / FPS); await el.screenshot({ path: `${dir}/${String(i / step).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 93 }); }
    // contact strip for checking the motion
    const every = Math.max(1, Math.round((n / step + 1) / 16));
    execSync(`ffmpeg -v error -y -framerate 1 -i ${dir}/%05d.jpg -vf "select='not(mod(n\\,${every}))',scale=216:-1,tile=8x2" -frames:v 1 ${OUT}/${p.id}-frames.jpg`);
    if (!PREVIEW) {
      const silent = `${dir}/v.mp4`, dur = (n + 1) / FPS;
      execSync(`ffmpeg -v error -y -framerate ${FPS} -i ${dir}/%05d.jpg -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -movflags +faststart ${silent}`);
      // audio: optional music bed (faded in/out) + timed sound cues
      const ins = [], chains = []; let k = 0;
      if (MUSIC !== 'none' && fs.existsSync(MUSIC)) { ins.push('-stream_loop', '-1', '-i', MUSIC); chains.push(`[${k + 1}:a]atrim=0:${dur},asetpts=N/SR/TB,volume=0.55,afade=t=in:d=0.6,afade=t=out:st=${Math.max(0, dur - 1.2)}:d=1.2[a${k}]`); k++; }
      for (const [t, name, g = 1] of p.cues) {
        const f = fs.existsSync(name) ? name : path.join(KIT, 'snd', name + '.mp3'); if (!fs.existsSync(f)) { console.log('missing sound', name); continue; }
        ins.push('-i', f); chains.push(`[${k + 1}:a]adelay=${Math.round(t * 1000)}|${Math.round(t * 1000)},volume=${g}[a${k}]`); k++;
      }
      const out = `${OUT}/${p.id}.mp4`;
      if (k) {
        const fc = chains.join(';') + ';' + Array.from({ length: k }, (_, i) => `[a${i}]`).join('') + `amix=inputs=${k}:normalize=0:duration=longest,atrim=0:${dur},alimiter=limit=0.9[mix]`;
        execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', silent, ...ins, '-filter_complex', fc, '-map', '0:v', '-map', '[mix]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '44100', '-ac', '2', '-shortest', '-movflags', '+faststart', out]);
      } else fs.copyFileSync(silent, out);
      console.log('video:', out, dur.toFixed(2) + 's', k ? `(${k} audio tracks)` : '(silent)');
    } else console.log('preview strip:', `${OUT}/${p.id}-frames.jpg`);
    fs.rmSync(dir, { recursive: true, force: true });
    await unsolo(); await page.setViewportSize({ width: 1200, height: 2000 });
  }
}
await b.close();
if (errs.length) console.log('page errors:', errs.slice(0, 5));
