import { json, sign, newId, checkTurnstile, clientIp } from './_lib.js';
// Step 1: pass spam checks, get a short-lived ticket that allows one letter upload and one submission.
export async function POST(req) {
  let b; try { b = await req.json(); } catch { return json({ error: 'bad request' }, 400); }
  if (b.website) return json({ error: 'blocked' }, 400);                  // honeypot
  if (!(Number(b.elapsed) >= 3000)) return json({ error: 'too fast' }, 400); // filled in under 3 s
  const ts = await checkTurnstile(b.turnstile, clientIp(req));
  if (!ts.ok) return json({ error: 'Please complete the check and try again.' }, 403);
  const id = newId();
  return json({ id, ticket: sign({ id, exp: Date.now() + 30 * 6e4 }) });
}
