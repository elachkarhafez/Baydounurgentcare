// Monthly leaderboard for "Outrun the flu". One private JSON file per month in Vercel Blob (scores/YYYY-MM.json).
// GET  -> this month's top 10 (names and scores only)
// POST -> { name, contact, dist, bottles, boosts, ms }: the server recomputes the score and checks the run adds up.
// Contacts (Instagram or phone) are stored so the owner can reach the winner, and are never returned.
import { get, put } from '@vercel/blob';

const MAX_SPEED = 32;            // m/s, a little above the game's cap of 30
const month = () => {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Detroit', year: 'numeric', month: '2-digit' }).formatToParts(new Date());
  return p.find(x => x.type === 'year').value + '-' + p.find(x => x.type === 'month').value;
};
const file = m => `scores/${m}.json`;
// ?dry=1 checks the whole path against a separate file, so a test never lands on the real board
const which = request => (new URL(request.url).searchParams.get('dry') === '1' ? 'dry-run' : month());
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const clean = (v, n) => String(v || '').replace(/[<>\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);
const pub = list => list.slice(0, 10).map((e, i) => ({ rank: i + 1, name: e.name, score: e.score }));

async function load(m) {
  try {
    const r = await get(file(m), { access: 'private', useCache: false });
    if (!r || r.statusCode !== 200 || !r.stream) return [];
    const list = JSON.parse(await new Response(r.stream).text());
    return Array.isArray(list) ? list : [];
  } catch (e) { return []; }
}

export async function GET(request) {
  const m = which(request);
  return json({ month: m, top: pub(await load(m)) });
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
  const m = which(request), list = await load(m);
  const key = contact.toLowerCase().replace(/[^a-z0-9@._+]/g, '');
  let me = list.find(e => e.key === key);
  if (me && score <= me.score) return json({ month: m, top: pub(list), rank: list.indexOf(me) + 1, score, best: me.score, kept: true });
  if (me) Object.assign(me, { name, contact, score, dist, bottles, boosts, at: Date.now() });
  else { me = { key, name, contact, score, dist, bottles, boosts, at: Date.now() }; list.push(me); }
  list.sort((a, c) => c.score - a.score);
  const keep = list.slice(0, 300);
  await put(file(m), JSON.stringify(keep), { access: 'private', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true });
  return json({ month: m, top: pub(keep), rank: keep.indexOf(me) + 1, score, best: score });
}
