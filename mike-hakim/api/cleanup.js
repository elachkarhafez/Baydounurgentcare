import { env, json, LETTER_TTL_DAYS } from './_lib.js';
import { listLetters, listRequests, saveRequest, del } from './_store.js';
// Daily cron. Letters already carry a 90-day TTL in Blob; this is the backup sweep,
// and it removes uploads that were never attached to a finished request.
export async function GET(req) {
  if (req.headers.get('authorization') !== `Bearer ${env('CRON_SECRET')}` || !env('CRON_SECRET')) return json({ error: 'unauthorized' }, 401);
  const now = Date.now(), letters = await listLetters(), reqs = await listRequests();
  const used = new Set(reqs.map(r => r.letter?.pathname).filter(Boolean));
  const gone = letters.filter(b => now - new Date(b.uploadedAt) > LETTER_TTL_DAYS * 864e5 || (!used.has(b.pathname) && now - new Date(b.uploadedAt) > 864e5)).map(b => b.pathname);
  if (gone.length) await del(gone);
  const goneSet = new Set(gone); let marked = 0;
  for (const r of reqs) if (r.letter && !r.letter.deleted && (goneSet.has(r.letter.pathname) || now - new Date(r.createdAt) > LETTER_TTL_DAYS * 864e5)) { r.letter.deleted = new Date().toISOString(); await saveRequest(r); marked++; }
  return json({ deleted: gone.length, marked });
}
