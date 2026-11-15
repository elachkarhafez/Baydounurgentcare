import { verify, env } from './_lib.js';
import { get } from '@vercel/blob';
// Streams a private letter for a valid, unexpired signed link. No public URL exists.
export async function GET(req) {
  const t = verify(new URL(req.url).searchParams.get('t'));
  const page = (msg, s) => new Response(`<!doctype html><meta name=viewport content="width=device-width"><meta name=robots content=noindex><body style="font:16px system-ui;padding:40px 20px;color:#0c1522;background:#f6f3ec"><p>${msg}</p>`, { status: s, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
  if (!t || !String(t.p).startsWith('letters/')) return page('This link has expired. Open the letter from your dashboard to get a fresh one.', 403);
  const g = await get(t.p, { access: 'private', useCache: false }).catch(() => null);
  if (!g || g.statusCode !== 200) return page('This letter is no longer stored. Letters are deleted 90 days after they were sent.', 404);
  const name = t.p.split('/').pop();
  return new Response(g.stream, { headers: {
    'content-type': g.blob.contentType || 'application/octet-stream',
    'content-disposition': `inline; filename="${name.replace(/[^\w.-]/g, '_')}"`,
    'cache-control': 'private, no-store', 'x-robots-tag': 'noindex, nofollow', 'referrer-policy': 'no-referrer', 'x-content-type-options': 'nosniff'
  } });
}
