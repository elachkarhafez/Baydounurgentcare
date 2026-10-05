// One-command Instagram brand read.  usage: node ig.mjs <handle> <outDir>
// 1) web_profile_info API (bio, links, 12 posts, captions, full-size images) — often rate-limited
// 2) fallback: render /embed/ in Chromium → name, followers, post images; decode each image's ig_cache_key
//    into a post shortcode; render /p/<code>/embed/captioned/ for every caption
// 3) og:description via a crawler UA for follower/following/post counts
// Writes <outDir>/brief.json, brief.md, img/postN.jpg and sheet.jpg (look at the sheet!).
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs'; import { execSync } from 'child_process';
const [handle, out] = process.argv.slice(2);
if (!handle || !out) { console.error('usage: node ig.mjs <handle> <outDir>'); process.exit(1); }
fs.mkdirSync(out + '/img', { recursive: true });
const sh = c => { try { return execSync(c, { maxBuffer: 5e7 }).toString(); } catch { return ''; } };
const curl = (url, ua, extra = '') => sh(`curl -sL --max-time 25 -A '${ua}' ${extra} '${url}'`);
const brief = { handle, source: [], name: '', bio: '', link: '', category: '', phone: '', email: '', address: '', counts: '', posts: [] };

// 1) API
for (const ua of ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Instagram 312.0.0.0', 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/124 Mobile Safari/537.36 Instagram 320.0.0.0 Android']) {
  try {
    const u = JSON.parse(curl(`https://i.instagram.com/api/v1/users/web_profile_info/?username=${handle}`, ua, `-H 'x-ig-app-id: 936619743392459'`)).data.user;
    Object.assign(brief, { name: u.full_name, bio: u.biography, link: u.external_url || (u.bio_links || []).map(l => l.url).join(' '), category: u.category_name || '', phone: u.business_phone_number || '', email: u.business_email || '', address: u.business_address_json || '', counts: `${u.edge_followed_by?.count} followers, ${u.edge_owner_to_timeline_media?.count} posts` });
    brief.posts = u.edge_owner_to_timeline_media.edges.map(e => ({ code: e.node.shortcode, video: e.node.is_video, img: e.node.display_url, caption: e.node.edge_media_to_caption.edges[0]?.node.text || '' }));
    brief.source.push('api'); break;
  } catch {}
}
// 3) counts via crawler UA
const og = curl(`https://www.instagram.com/${handle}/`, 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)').match(/og:description" content="([^"]+)"/);
if (og && !brief.counts) brief.counts = og[1].replace(/&#\w+;/g, ' ').split(' - ')[0];
// 2) embed fallback
if (!brief.posts.length) {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined, args: ['--ignore-certificate-errors'] });
  const p = await b.newPage({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36', viewport: { width: 600, height: 1400 } });
  await p.goto(`https://www.instagram.com/${handle}/embed/`, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
  await p.waitForTimeout(2500);
  const em = await p.evaluate(() => ({ text: document.body.innerText.slice(0, 600), imgs: [...document.querySelectorAll('img')].map(i => i.src).filter(s => /scontent|fbcdn/.test(s)) }));
  const lines = em.text.split('\n').map(s => s.trim()).filter(Boolean); brief.name = brief.name || lines[1] || ''; if (!brief.counts) brief.counts = lines.slice(2, 5).join(' ');
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  for (const src of em.imgs) {
    const m = src.match(/ig_cache_key=([^&]+)/); if (!m) { brief.avatar = src; continue; }
    const k = decodeURIComponent(m[1]).split('.')[0], id = Buffer.from(k + '='.repeat((4 - k.length % 4) % 4), 'base64').toString();
    let n = BigInt(id.slice(0, 19)), code = ''; while (n > 0n) { code = A[Number(n % 64n)] + code; n /= 64n; }
    brief.posts.push({ code, img: src, caption: '' });
  }
  for (const post of brief.posts) {
    await p.goto(`https://www.instagram.com/p/${post.code}/embed/captioned/`, { waitUntil: 'networkidle', timeout: 40000 }).catch(() => {});
    await p.waitForTimeout(1200);
    post.caption = (await p.evaluate(() => (document.querySelector('.Caption') || {}).innerText || '').catch(() => '')).replace(/^\S+\s/, '').replace(/View all \d+ comments?$/, '').trim();
  }
  await b.close(); brief.source.push('embed');
}
// images + sheet
brief.posts.forEach((post, i) => { post.file = `img/post${i + 1}.jpg`; sh(`curl -sL --max-time 25 -o '${out}/${post.file}' '${post.img}'`); });
if (brief.avatar) sh(`curl -sL -o '${out}/img/avatar.jpg' '${brief.avatar}' && convert '${out}/img/avatar.jpg' -resize 300x300 '${out}/img/avatar_big.png'`);
const files = brief.posts.map(p => `${out}/${p.file}`).filter(f => fs.existsSync(f) && fs.statSync(f).size > 1000);
if (files.length) sh(`montage -label '%f' -geometry 240x240+3+3 -tile 6x ${brief.avatar ? out + '/img/avatar_big.png ' : ''}${files.join(' ')} '${out}/sheet.jpg'`);
// pull phone / address-looking strings out of captions too
const all = brief.posts.map(p => p.caption).join('\n') + '\n' + brief.bio;
brief.phonesSeen = [...new Set(all.match(/\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g) || [])];
brief.addressesSeen = [...new Set(all.match(/\d{2,6}\s+[A-Z][\w.]*(?:\s+[A-Z][\w.]*){0,4}\s+(?:Rd|Road|St|Street|Ave|Avenue|Blvd|Dr|Drive|Hwy|Ln|Way|Ct|Pkwy)\b[^\n#]{0,40}/g) || [])];
fs.writeFileSync(`${out}/brief.json`, JSON.stringify(brief, null, 1));
const md = [`# @${handle}`, `- name: ${brief.name}`, `- counts: ${brief.counts}`, `- bio: ${brief.bio || '(not available)'}`, `- link: ${brief.link}`, `- category: ${brief.category}`, `- phone: ${brief.phone || brief.phonesSeen.join(', ')}`, `- address: ${brief.address || brief.addressesSeen.join(' | ')}`, `- source: ${brief.source.join('+')}`, '', '## Posts', ...brief.posts.map(p => `- ${p.file} (https://www.instagram.com/p/${p.code}/): ${p.caption.replace(/\n+/g, ' ').slice(0, 400)}`)].join('\n');
fs.writeFileSync(`${out}/brief.md`, md);
console.log(md, `\n\nsheet: ${out}/sheet.jpg`);
