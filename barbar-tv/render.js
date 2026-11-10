// Renders one TV screen to a seamless 60 s MP4 loop. Serve the repo root on :8766 first (python3 -m http.server 8766),
// then: [FPS=60] [QUALITY=max] node barbar-tv/render.js <tv> <out.mp4> [set: 3 or 4]. Needs Playwright + ffmpeg.
// QUALITY=max captures lossless PNG frames and encodes once, straight to the TV file (high bitrate, BT.709, silent
// AAC track, fixed GOP), so there is no second lossy pass. Without it: JPEG frames into a crf 18 master, as before.
const { chromium } = require('playwright'); const { spawn } = require('child_process');
(async () => {
  const tv = process.argv[2], out = process.argv[3], set = process.argv[4] ? `&set=${process.argv[4]}` : "", LOOP = 60, FPS = +(process.env.FPS || 30), N = LOOP * FPS;
  const MAX = process.env.QUALITY === 'max';
  const b = await chromium.launch(); const p = await b.newPage({ viewport:{ width:1080, height:1920 } });
  await p.goto(`http://localhost:8766/barbar-tv/?tv=${tv}${set}&cap=1`);
  await p.waitForFunction(() => window.__ready);
  const level = FPS > 30 ? '4.2' : '4.1';
  const args = MAX
    ? ['-y','-loglevel','error','-f','image2pipe','-framerate',String(FPS),'-c:v','png','-i','-',
       '-f','lavfi','-i','anullsrc=channel_layout=stereo:sample_rate=48000','-map','0:v','-map','1:a',
       '-c:v','libx264','-preset','veryslow','-tune','animation','-crf','12','-maxrate','24M','-bufsize','48M',
       '-pix_fmt','yuv420p','-vf','scale=out_color_matrix=bt709:flags=lanczos+accurate_rnd+full_chroma_int',
       '-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-color_range','tv',
       '-profile:v','high','-level',level,'-r',String(FPS),'-g',String(FPS),'-keyint_min',String(FPS),'-sc_threshold','0',
       '-c:a','aac','-b:a','128k','-ac','2','-t',String(LOOP),'-movflags','+faststart', out]
    : ['-y','-loglevel','error','-f','image2pipe','-framerate',String(FPS),'-c:v','mjpeg','-i','-','-c:v','libx264','-preset','slow','-crf','18','-pix_fmt','yuv420p','-profile:v','high','-level',level,'-g',String(FPS*2),'-movflags','+faststart', out];
  const ff = spawn('ffmpeg', args);
  ff.stderr.on('data', d => process.stderr.write(d));
  for (let f = 0; f < N; f++) {
    await p.evaluate(t => window.renderAt(t), f / FPS);
    const buf = await p.screenshot(MAX ? { type:'png' } : { type:'jpeg', quality:95 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 300 === 0) console.log(`tv${tv} ${f}/${N}`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await b.close(); console.log(`tv${tv} done`);
})();
