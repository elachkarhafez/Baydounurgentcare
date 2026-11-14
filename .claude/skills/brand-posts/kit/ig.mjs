// Pull a brand straight from Instagram through its public embed pages (the widget Instagram serves to websites).
//   node ig.mjs <handle> <outdir> [--max 12]
// Optional official route: set IG_GRAPH_TOKEN (an Instagram Graph API token the client gives you) to read their media
// through graph.instagram.com instead; it returns every post at full size.
// Writes <outdir>/ig.json (name, bio line, counts, posts with caption / image / video), img/ig-<n>.jpg (largest size
// the embed offers), vid/ig-<n>.mp4 for reels when the embed exposes the file, and ig-sheet.jpg (look at it).
// Never uses Instagram's private app API or logged-in scraping.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { execFileSync } from 'child_process';
import fs from 'fs';

const args = process.argv.slice(2), [handleArg, OUT] = args, MAX = +(args[args.indexOf('--max') + 1] || 12) || 12;
if (!handleArg || !OUT) { console.log('usage: node ig.mjs <handle> <outdir> [--max 12]'); process.exit(1); }
const handle = handleArg.replace(/^@|https?:\/\/(www\.)?instagram\.com\/|\/.*$/g, '');
fs.mkdirSync(`${OUT}/img`, { recursive: true }); fs.mkdirSync(`${OUT}/vid`, { recursive: true });
const dl = (u, f) => { try { execFileSync('curl', ['-sL', '--max-time', '40', '-A', 'Mozilla/5.0 Chrome/128', '-o', f, u]); return fs.existsSync(f) && fs.statSync(f).size > 2000; } catch { return false; } };
const info = { handle, source: '', name: '', line: '', counts: '', posts: [] };

if (process.env.IG_GRAPH_TOKEN) {
  // official Graph API (Instagram Login): the client's own token
  const q = `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,children{media_type,media_url}&limit=${MAX}&access_token=${process.env.IG_GRAPH_TOKEN}`;
  try {
    const j = JSON.parse(execFileSync('curl', ['-sL', '--max-time', '40', q]).toString());
    info.source = 'graph';
    for (const m of j.data || []) info.posts.push({ code: (m.permalink || '').split('/').filter(Boolean).pop(), url: m.permalink, date: m.timestamp, caption: m.caption || '', video: m.media_type === 'VIDEO', img: m.media_type === 'VIDEO' ? m.thumbnail_url : m.media_url, videoUrl: m.media_type === 'VIDEO' ? m.media_url : '', more: (m.children?.data || []).map(c => c.media_url) });
  } catch (e) { console.log('graph api failed, falling back to the embed:', e.message.slice(0, 120)); }
}

if (!info.posts.length) {
  info.source = 'embed';
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined });
  const p = await b.newPage({ viewport: { width: 600, height: 1400 }, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36' });
  await p.goto(`https://www.instagram.com/${handle}/embed/`, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
  await p.waitForTimeout(2500);
  const em = await p.evaluate(() => ({ text: document.body.innerText, imgs: [...document.querySelectorAll('img')].map(i => i.currentSrc || i.src) }));
  const lines = em.text.split('\n').map(s => s.trim()).filter(Boolean);
  if (/isn.t available|may be broken|Page Not Found/i.test(em.text) || lines.length < 2) { console.log(`@${handle}: the profile embed is not available (private, renamed or blocked)`); await b.close(); process.exit(2); }
  info.name = lines[0]; info.line = lines[1] || ''; info.counts = lines.slice(2).filter(l => /followers|posts/.test(l)).join(' · ');
  const avatar = em.imgs.find(s => !/ig_cache_key/.test(s) && /scontent|fbcdn|cdninstagram/.test(s)); if (avatar) dl(avatar, `${OUT}/img/ig-avatar.jpg`);
  // each grid image carries ig_cache_key = base64(media id); the media id maps to the post's shortcode
  const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const codes = [];
  for (const src of em.imgs) {
    const m = src.match(/ig_cache_key=([^&]+)/); if (!m) continue;
    const k = decodeURIComponent(m[1]).split('.')[0], id = Buffer.from(k + '='.repeat((4 - k.length % 4) % 4), 'base64').toString();
    if (!/^\d{10,}/.test(id)) continue;
    let n = BigInt(id.slice(0, 19)), code = ''; while (n > 0n) { code = ABC[Number(n % 64n)] + code; n /= 64n; }
    if (!codes.includes(code)) codes.push(code);
  }
  for (const code of codes.slice(0, MAX)) {
    const post = { code, url: `https://www.instagram.com/p/${code}/`, caption: '', video: false, img: '', videoUrl: '', more: [] };
    await p.goto(`https://www.instagram.com/p/${code}/embed/captioned/`, { waitUntil: 'networkidle', timeout: 40000 }).catch(() => {});
    await p.waitForTimeout(1200);
    // the embed page carries the post's own data (contextJSON): full-size image, caption, date, carousel, video when allowed
    const html = await p.content();
    let media = null;
    try { const m = html.match(/"contextJSON":"((?:[^"\\]|\\.)*)"/); if (m) media = JSON.parse(JSON.parse('"' + m[1] + '"')).gql_data?.shortcode_media || null; } catch {}
    if (media) {
      const best = n => (n.display_resources || []).sort((a, b) => b.config_width - a.config_width)[0]?.src || n.display_url || '';
      Object.assign(post, { img: best(media), video: !!media.is_video, videoUrl: media.video_url || '', date: media.taken_at_timestamp ? new Date(media.taken_at_timestamp * 1000).toISOString().slice(0, 10) : '',
        caption: media.edge_media_to_caption?.edges?.[0]?.node?.text || '', more: (media.edge_sidecar_to_children?.edges || []).slice(1).map(e => best(e.node)),
        likes: media.edge_liked_by?.count ?? media.edge_media_preview_like?.count ?? '', views: media.video_view_count || '' });
    } else {
      Object.assign(post, await p.evaluate(() => {
        const img = document.querySelector('.EmbeddedMediaImage'), cap = (document.querySelector('.Caption') || {}).innerText || '';
        return { img: img ? (img.currentSrc || img.src) : '', caption: cap.replace(/^\S+\s+/, '').trim(), video: /\bPlay\b/.test(document.body.innerText) };
      }).catch(() => ({})));
    }
    info.posts.push(post);
  }
  await b.close();
}

// download
info.posts.forEach((post, i) => {
  if (post.img && dl(post.img, `${OUT}/img/ig-${i + 1}.jpg`)) post.file = `img/ig-${i + 1}.jpg`;
  (post.more || []).slice(0, 4).forEach((u, j) => { if (dl(u, `${OUT}/img/ig-${i + 1}-${j + 2}.jpg`)) (post.files = post.files || []).push(`img/ig-${i + 1}-${j + 2}.jpg`); });
  if (post.videoUrl && /^https?:/.test(post.videoUrl) && dl(post.videoUrl, `${OUT}/vid/ig-${i + 1}.mp4`)) {
    post.videoFile = `vid/ig-${i + 1}.mp4`;
    // three stills from the reel, for posts that need its frames
    try { execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', `${OUT}/${post.videoFile}`, '-vf', 'fps=1/2,scale=1080:-2', '-frames:v', '3', `${OUT}/img/ig-${i + 1}-frame%d.jpg`]); } catch {}
  }
});
fs.writeFileSync(`${OUT}/ig.json`, JSON.stringify(info, null, 1));
// contact sheet
const files = fs.readdirSync(`${OUT}/img`).filter(f => /^ig-/.test(f)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).map(f => `${OUT}/img/${f}`);
if (files.length) try { execFileSync('python3', ['-c', `import sys
from PIL import Image, ImageDraw
fs=sys.argv[1:]; W,H,c=200,250,6; r=(len(fs)+c-1)//c; s=Image.new('RGB',(W*c,(H+16)*r),'white'); d=ImageDraw.Draw(s)
for k,f in enumerate(fs):
  try:
    im=Image.open(f).convert('RGB'); im.thumbnail((W-6,H-6)); x,y=k%c*W,k//c*(H+16); s.paste(im,(x+3,y+3)); d.text((x+3,y+H),f.split('/')[-1]+' %dx%d'%Image.open(f).size,fill='black')
  except Exception: pass
s.save('${OUT}/ig-sheet.jpg',quality=82)`, ...files]); } catch {}
console.log(`@${handle} via ${info.source}: ${info.name} | ${info.line} | ${info.counts}`);
info.posts.forEach((q, i) => console.log(`${i + 1}. ${q.video ? 'reel' : 'post'} ${q.url} ${q.file || '(no image)'}${q.videoFile ? ' + ' + q.videoFile : ''}\n   ${(q.caption || '').replace(/\s+/g, ' ').slice(0, 220)}`));
console.log(`sheet: ${OUT}/ig-sheet.jpg`);
