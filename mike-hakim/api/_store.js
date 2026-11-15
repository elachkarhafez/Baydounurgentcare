// Request records live as private JSON blobs: requests/<id>.json
import { put, get, list, del } from '@vercel/blob';

export async function saveRequest(r) {
  await put(`requests/${r.id}.json`, JSON.stringify(r), { access: 'private', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 60 });
  return r;
}
export async function readRequest(id) {
  if (!/^[a-z0-9]+-[a-f0-9]{10}$/.test(id)) return null;
  const g = await get(`requests/${id}.json`, { access: 'private', useCache: false });
  if (!g || g.statusCode !== 200) return null;
  return JSON.parse(await new Response(g.stream).text());
}
export async function listRequests() {
  const out = []; let cursor;
  do {
    const page = await list({ prefix: 'requests/', cursor, limit: 1000 });
    out.push(...page.blobs); cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  out.sort((a, b) => b.pathname.localeCompare(a.pathname));
  const recs = await Promise.all(out.slice(0, 300).map(b => readRequest(b.pathname.slice(9, -5)).catch(() => null)));
  return recs.filter(Boolean).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export async function listLetters() {
  const out = []; let cursor;
  do { const page = await list({ prefix: 'letters/', cursor, limit: 1000 }); out.push(...page.blobs); cursor = page.hasMore ? page.cursor : undefined; } while (cursor);
  return out;
}
export async function readHead(pathname, n = 16) {
  const g = await get(pathname, { access: 'private', useCache: false });
  if (!g || g.statusCode !== 200) return null;
  const reader = g.stream.getReader(); const chunks = []; let len = 0;
  while (len < n) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); len += value.length; }
  reader.cancel().catch(() => {});
  return { bytes: Buffer.concat(chunks).subarray(0, n), size: g.blob.size, contentType: g.blob.contentType };
}
export { get, del };
