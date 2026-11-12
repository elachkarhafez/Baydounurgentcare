// Monthly leaderboard for "Outrun the flu", in a private Vercel Blob store.
// Every player has their own file, so two people posting at the same moment can never overwrite each other:
//   scores/<YYYY-MM>/<score, 9 digits>~<player id>~<name, base64url>.json   (contents: name, contact, run details)
// The board is built from the file names alone, so reading it never opens anyone's contact details.
// GET  -> this month's top 10 (names and scores only)
// POST -> { name, contact, dist, bottles, boosts, ms }: the server recomputes the score and checks the run adds up.
import { list, put, del } from '@vercel/blob';
import { createHash } from 'node:crypto';

const MAX_SPEED = 32;            // m/s, a little above the game's cap of 30
const month = () => {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Detroit', year: 'numeric', month: '2-digit' }).formatToParts(new Date());
  return p.find(x => x.type === 'year').value + '-' + p.find(x => x.type === 'month').value;
};
// ?dry=1 runs the whole path against a separate folder, so a test never lands on the real board
const which = request => (new URL(request.url).searchParams.get('dry') === '1' ? 'dry-run' : month());
const dir = m => `scores/${m}/`;
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const clean = (v, n) => String(v || '').replace(/[<>\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);
const enc = s => Buffer.from(s, 'utf8').toString('base64url');
const dec = s => { try { return Buffer.from(s, 'base64url').toString('utf8'); } catch (e) { return '?'; } };

// every entry this month, best first, one per player (if a player somehow has two files, the higher one counts)
async function board(m) {
  const all = []; let cursor;
  do {
    const r = await list({ prefix: dir(m), cursor, limit: 1000 });
    for (const b of r.blobs) {
      const [sc, id, nm] = b.pathname.slice(dir(m).length).replace(/\.json$/, '').split('~');
      if (id && /^\d+$/.test(sc)) all.push({ score: +sc, id, name: dec(nm || ''), pathname: b.pathname });
    }
    cursor = r.hasMore ? r.cursor : undefined;
  } while (cursor);
  all.sort((a, b) => b.score - a.score || a.pathname.localeCompare(b.pathname));
  const seen = new Set(), best = [], extra = [];
  for (const e of all) { if (seen.has(e.id)) extra.push(e); else { seen.add(e.id); best.push(e); } }
  return { best, extra, all };
}
const pub = best => best.slice(0, 10).map((e, i) => ({ rank: i + 1, name: e.name, score: e.score }));

export async function GET(request) {
  const m = which(request);
  try { return json({ month: m, top: pub((await board(m)).best) }); }
  catch (e) { return json({ month: m, top: [], error: 'The board is busy. Try again.' }, 503); }
}

export async function POST(request) {
  let b;
  try { b = await request.json(); } catch (e) { return json({ error: 'Something went wrong. Try again.' }, 400); }
  const name = clean(b.name, 18), contact = clean(b.contact, 40);
  if (!name || contact.length < 3) return json({ error: 'Add your name and your Instagram or phone so we can reach you if you win.' }, 400);
  const dist = Math.floor(+b.dist || 0), bottles = Math.floor(+b.bottles || 0), boosts = Math.floor(+b.boosts || 0), ms = Math.floor(+b.ms || 0);
  const secs = ms / 1000;
  const adds = secs >= 4 && secs < 3 * 3600 && dist >= 0 && dist <= secs * MAX_SPEED + 30 && bottles >= 0 && bottles <= dist / 2 + 5 && boosts >= 0 && boosts <= dist / 120 + 1;
  if (!adds) return json({ error: "That run doesn't add up, so it can't go on the board." }, 422);
  const score = dist + bottles * 10 + boosts * 50;
  const m = which(request);
  const key = contact.toLowerCase().replace(/[^a-z0-9@._+]/g, '');
  const id = createHash('sha256').update(key).digest('hex').slice(0, 16);
  try {
    const { best, all } = await board(m);
    const mine = best.find(e => e.id === id);
    if (mine && score <= mine.score) return json({ month: m, top: pub(best), rank: best.indexOf(mine) + 1, score, best: mine.score, kept: true });
    const pathname = `${dir(m)}${String(score).padStart(9, '0')}~${id}~${enc(name)}.json`;
    await put(pathname, JSON.stringify({ name, contact, score, dist, bottles, boosts, ms, at: new Date().toISOString() }), { access: 'private', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true });
    // their older, lower files go; the new one is already saved, so nothing is lost if this step fails
    const old = all.filter(e => e.id === id && e.pathname !== pathname).map(e => e.pathname);
    if (old.length) await del(old).catch(() => {});
    const top = best.filter(e => e.id !== id).concat({ id, name, score, pathname }).sort((a, c) => c.score - a.score || a.pathname.localeCompare(c.pathname));
    return json({ month: m, top: pub(top), rank: top.findIndex(e => e.id === id) + 1, score, best: score });
  } catch (e) {
    return json({ error: 'That didn’t save. Try again in a moment.' }, 503);
  }
}
