// Renders one TV screen to a seamless 40 s MP4 loop. Serve the repo root on :8766 first (python3 -m http.server 8766),
// then: node barbar-tv/render.js <tv 1-4> <out.mp4>. Needs Playwright + ffmpeg.
const { chromium } = require('playwright'); const { spawn } = require('child_process');
(async () => {
  const tv = process.argv[2], out = process.argv[3], LOOP = 40, FPS = 30, N = LOOP * FPS;
  const b = await chromium.launch(); const p = await b.newPage({ viewport:{ width:1080, height:1920 } });
  await p.goto(`http://localhost:8766/barbar-tv/?tv=${tv}&cap=1`);
  await p.waitForFunction(() => window.__ready);
  const ff = spawn('ffmpeg', ['-y','-loglevel','error','-f','image2pipe','-framerate',String(FPS),'-c:v','mjpeg','-i','-','-c:v','libx264','-preset','slow','-crf','18','-pix_fmt','yuv420p','-profile:v','high','-level','4.1','-g',String(FPS*2),'-movflags','+faststart', out]);
  ff.stderr.on('data', d => process.stderr.write(d));
  for (let f = 0; f < N; f++) {
    await p.evaluate(t => window.renderAt(t), f / FPS);
    const buf = await p.screenshot({ type:'jpeg', quality:95 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 300 === 0) console.log(`tv${tv} ${f}/${N}`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await b.close(); console.log(`tv${tv} done`);
})();
