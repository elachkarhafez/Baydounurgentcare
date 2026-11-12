// The owner's dashboard behind /admin. Everything lives in the same private Blob store as the scores.
//   admin/config.json  -> the password (scrypt hash) and a version number that logs everyone out when it changes
//   admin/lock.json    -> failed logins, so the 4-digit password can't just be guessed
//   admin/given.json   -> which monthly winners already got their 3 shots
// POST { action: 'login', password }                         -> { token }
// GET  (Authorization: Bearer <token>)                         -> every month's board with contacts
// POST { action: 'password', current, next } (with token)      -> { token } (new one, old ones stop working)
// POST { action: 'given', month, on } (with token)             -> marks a winner as paid out
// POST { action: 'remove', month, id } (with token)            -> takes a player off a board
import { list, put, del, get } from '@vercel/blob';
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const DEFAULT_PASSWORD = '2023';
const SECRET = () => process.env.ADMIN_KEY || process.env.BLOB_READ_WRITE_TOKEN || 'elevated';
const MAX_FAILS = 6, LOCK_MS = 10 * 60 * 1000, TOKEN_MS = 12 * 3600 * 1000;

const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } });
const dec = s => { try { return Buffer.from(s, 'base64url').toString('utf8'); } catch (e) { return '?'; } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const month = () => { const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Detroit', year: 'numeric', month: '2-digit' }).formatToParts(new Date()); return p.find(x => x.type === 'year').value + '-' + p.find(x => x.type === 'month').value; };

async function readJSON(pathname, fallback) {
  try { const r = await get(pathname, { access: 'private', useCache: false }); if (r && r.stream) return JSON.parse(await new Response(r.stream).text()); } catch (e) {}
  return fallback;
}
const writeJSON = (pathname, o) => put(pathname, JSON.stringify(o), { access: 'private', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true });

const hash = (pw, salt) => scryptSync(String(pw), salt, 32).toString('hex');
async function config() { return readJSON('admin/config.json', null); }
async function checkPassword(pw) {
  const c = await config();
  if (!c) return { ok: String(pw) === DEFAULT_PASSWORD, v: 0, isDefault: true };
  const a = Buffer.from(hash(pw, c.salt), 'hex'), b = Buffer.from(c.hash, 'hex');
  return { ok: a.length === b.length && timingSafeEqual(a, b), v: c.v, isDefault: !!c.starter };
}

const sign = body => createHmac('sha256', SECRET()).update(body).digest('base64url');
const makeToken = v => { const body = Buffer.from(JSON.stringify({ v, exp: Date.now() + TOKEN_MS })).toString('base64url'); return body + '.' + sign(body); };
async function auth(request) {
  const t = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, ''), [body, sig] = t.split('.');
  if (!body || !sig) return null;
  const want = Buffer.from(sign(body)), got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  let p; try { p = JSON.parse(dec(body)); } catch (e) { return null; }
  if (!p || p.exp < Date.now()) return null;
  const c = await config();
  return (c ? c.v : 0) === p.v ? p : null;
}

// one month's players, best first, one row per player
async function board(m) {
  const pre = `scores/${m}/`, all = []; let cursor;
  do {
    const r = await list({ prefix: pre, cursor, limit: 1000 });
    for (const b of r.blobs) { const [sc, id, nm] = b.pathname.slice(pre.length).replace(/\.json$/, '').split('~'); if (id && /^\d+$/.test(sc)) all.push({ score: +sc, id, name: dec(nm || ''), pathname: b.pathname }); }
    cursor = r.hasMore ? r.cursor : undefined;
  } while (cursor);
  all.sort((a, b) => b.score - a.score || a.pathname.localeCompare(b.pathname));
  const seen = new Set(), best = [];
  for (const e of all) if (!seen.has(e.id)) { seen.add(e.id); best.push(e); }
  return { best, all };
}
async function details(rows) {
  const out = [];
  for (let i = 0; i < rows.length; i += 20) {
    const part = await Promise.all(rows.slice(i, i + 20).map(async (e, k) => {
      const d = await readJSON(e.pathname, {});
      return { rank: i + k + 1, id: e.id, name: e.name, score: e.score, contact: d.contact || '', dist: d.dist || 0, bottles: d.bottles || 0, boosts: d.boosts || 0, secs: Math.round((d.ms || 0) / 1000), at: d.at || null };
    }));
    out.push(...part);
  }
  return out;
}
async function months() {
  const set = new Set(); let cursor;
  do {
    const r = await list({ prefix: 'scores/', mode: 'folded', cursor });
    (r.folders || []).forEach(f => { const m = f.replace(/^scores\//, '').replace(/\/$/, ''); if (/^\d{4}-\d{2}$/.test(m)) set.add(m); });
    cursor = r.hasMore ? r.cursor : undefined;
  } while (cursor);
  set.add(month());
  return [...set].sort().reverse().slice(0, 24);
}

export async function GET(request) {
  if (!(await auth(request))) return json({ error: 'Log in again.' }, 401);
  try {
    const now = month(), ms = await months(), given = await readJSON('admin/given.json', {});
    const out = [];
    for (const m of ms) {
      const { best } = await board(m);
      const rows = await details(m === now ? best.slice(0, 500) : best.slice(0, 10));
      out.push({ month: m, players: best.length, rows, given: !!given[m], current: m === now });
    }
    const c = await config();
    return json({ now, months: out, defaultPassword: !c || !!c.starter });
  } catch (e) { return json({ error: 'Couldn’t load the board. Try again.' }, 503); }
}

export async function POST(request) {
  let b; try { b = await request.json(); } catch (e) { return json({ error: 'Something went wrong.' }, 400); }
  if (b.action === 'login') {
    const lock = await readJSON('admin/lock.json', { fails: 0, until: 0 });
    if (lock.until > Date.now()) return json({ error: `Too many tries. Wait ${Math.ceil((lock.until - Date.now()) / 60000)} min.` }, 429);
    const r = await checkPassword(String(b.password || '').slice(0, 64));
    if (!r.ok) {
      const fails = (lock.until && lock.until < Date.now() ? 0 : lock.fails) + 1;
      await writeJSON('admin/lock.json', { fails: fails >= MAX_FAILS ? 0 : fails, until: fails >= MAX_FAILS ? Date.now() + LOCK_MS : 0 }).catch(() => {});
      await sleep(700);
      return json({ error: fails >= MAX_FAILS ? 'Too many tries. Wait 10 min.' : 'Wrong password.' }, 401);
    }
    if (lock.fails) await writeJSON('admin/lock.json', { fails: 0, until: 0 }).catch(() => {});
    return json({ token: makeToken(r.v), defaultPassword: r.isDefault });
  }
  if (!(await auth(request))) return json({ error: 'Log in again.' }, 401);
  if (b.action === 'password') {
    const next = String(b.next || '');
    if (next.length < 4 || next.length > 64) return json({ error: 'Use at least 4 characters.' }, 400);
    const r = await checkPassword(String(b.current || ''));
    if (!r.ok) { await sleep(700); return json({ error: 'Your current password isn’t right.' }, 401); }
    const salt = randomBytes(16).toString('hex'), v = (r.v || 0) + 1;
    await writeJSON('admin/config.json', { hash: hash(next, salt), salt, v, starter: next === DEFAULT_PASSWORD, at: new Date().toISOString() });
    return json({ ok: true, token: makeToken(v) });
  }
  if (b.action === 'given') {
    if (!/^\d{4}-\d{2}$/.test(b.month || '')) return json({ error: 'Bad month.' }, 400);
    const given = await readJSON('admin/given.json', {});
    if (b.on) given[b.month] = new Date().toISOString(); else delete given[b.month];
    await writeJSON('admin/given.json', given);
    return json({ ok: true, given: !!given[b.month] });
  }
  if (b.action === 'remove') {
    if (!/^\d{4}-\d{2}$/.test(b.month || '') || !/^[0-9a-f]{16}$/.test(b.id || '')) return json({ error: 'Bad request.' }, 400);
    const { all } = await board(b.month), gone = all.filter(e => e.id === b.id).map(e => e.pathname);
    if (gone.length) await del(gone);
    return json({ ok: true, removed: gone.length });
  }
  return json({ error: 'Unknown action.' }, 400);
}
