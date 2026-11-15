import { json, verify, validateRequest, sniff, TYPES, MAX_BYTES, LETTER_TTL_DAYS, letterLink, siteUrl, env } from './_lib.js';
import { saveRequest, readRequest, readHead, del } from './_store.js';
import { sendEmail, sendFub } from './_notify.js';
// Step 3: the request itself. Validates everything server-side, checks the uploaded
// letter's real file type and size, stores the record, then notifies Mike.
export async function POST(req) {
  let b; try { b = await req.json(); } catch { return json({ error: 'bad request' }, 400); }
  if (b.website) return json({ error: 'blocked' }, 400);
  const t = verify(b.ticket);
  if (!t) return json({ error: 'Your session expired. Please send it again.' }, 403);
  if (await readRequest(t.id)) return json({ error: 'This request was already sent.' }, 409);
  const { errs, data } = validateRequest(b);
  if (errs.length) return json({ error: 'Please check the highlighted fields.', fields: errs }, 422);

  let letter = null;
  if (b.letter?.pathname) {
    const p = String(b.letter.pathname);
    if (!p.startsWith(`letters/${t.id}/`)) return json({ error: 'Upload not recognised.' }, 400);
    if (!b.consent) { await del(p).catch(() => {}); return json({ error: 'Please tick the box so Mike can keep your letter.', fields: ['consent'] }, 422); }
    const h = await readHead(p).catch(() => null);
    if (!h) return json({ error: 'We could not find your upload. Please attach it again.', fields: ['letter'] }, 422);
    const real = h.bytes && sniff(h.bytes);
    if (!real || h.size > MAX_BYTES || !TYPES[h.contentType]) {
      await del(p).catch(() => {});
      return json({ error: 'That file is not a PDF, JPG, PNG or HEIC under 10 MB.', fields: ['letter'] }, 422);
    }
    letter = { pathname: p, name: String(b.letter.name || p.split('/').pop()).slice(0, 120), type: real, size: h.size, deleteAfter: new Date(Date.now() + LETTER_TTL_DAYS * 864e5).toISOString() };
  }

  const origin = siteUrl(req);
  const r = { id: t.id, createdAt: new Date().toISOString(), status: 'new', ...data, letter, consent: !!b.consent, notify: {} };
  await saveRequest(r);

  const link = letter ? letterLink(origin, letter.pathname, 7) : null;
  const slug = env('DASHBOARD_SLUG');
  const [email, fub] = await Promise.all([
    sendEmail(r, { link, dashUrl: slug ? `${origin}/${slug}` : null }).catch(e => ({ status: 'failed', why: e.message })),
    sendFub(r, { link, siteUrl: origin }).catch(e => ({ status: 'failed', why: e.message }))
  ]);
  r.notify = { email, fub };
  await saveRequest(r);
  console.log('showing', r.id, JSON.stringify(r.notify));
  return json({ ok: true, id: r.id });
}
