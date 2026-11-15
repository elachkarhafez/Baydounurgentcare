// Shared helpers for the showing-request backend.
// Files starting with "_" are not exposed as functions by Vercel.
import crypto from 'node:crypto';

export const TZ = 'America/Detroit';
export const MAX_BYTES = 10 * 1024 * 1024;
export const LETTER_TTL_DAYS = 90;
export const TYPES = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/heic': 'heic', 'image/heif': 'heif' };

const env = k => (process.env[k] || '').trim();
export { env };

export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers } });

const key = () => {
  const s = env('SIGNING_SECRET');
  if (!s) throw new Error('SIGNING_SECRET is not set');
  return s;
};
const b64u = b => Buffer.from(b).toString('base64url');
export const hmac = str => crypto.createHmac('sha256', key()).update(str).digest('base64url');
export const safeEq = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

// Signed, expiring token: base64url(json).sig
export function sign(obj) { const p = b64u(JSON.stringify(obj)); return p + '.' + hmac(p); }
export function verify(tok) {
  if (typeof tok !== 'string' || !tok.includes('.')) return null;
  const [p, s] = tok.split('.');
  if (!safeEq(hmac(p), s)) return null;
  try { const o = JSON.parse(Buffer.from(p, 'base64url').toString()); return o.exp && o.exp > Date.now() ? o : null; } catch { return null; }
}

export const newId = () => Date.now().toString(36) + '-' + crypto.randomBytes(5).toString('hex');

export function siteUrl(req) {
  const fixed = env('SITE_URL');
  if (fixed) return fixed.replace(/\/$/, '');
  const u = new URL(req.url);
  return u.origin;
}

// Expiring link Mike can open without logging in. The letter never has a public URL;
// this endpoint streams it from the private store after checking the signature.
export function letterLink(origin, pathname, days = 7) {
  const t = sign({ p: pathname, exp: Date.now() + days * 864e5 });
  return `${origin}/api/letter?t=${encodeURIComponent(t)}`;
}

/* ---------- time helpers (Mike works in Detroit time) ---------- */
// Convert a wall-clock date + time in America/Detroit to a UTC Date.
export function detroitToUtc(date, time) {
  const [y, m, d] = date.split('-').map(Number), [hh, mm] = time.split(':').map(Number);
  let guess = Date.UTC(y, m - 1, d, hh, mm);
  for (let i = 0; i < 2; i++) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(guess)).map(p => [p.type, p.value]));
    const seen = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute);
    guess += Date.UTC(y, m - 1, d, hh, mm) - seen;
  }
  return new Date(guess);
}
export const fmtSlot = s => new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(s.start));

/* ---------- validation ---------- */
const clean = (v, n) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n);
export function validateRequest(b) {
  const errs = [];
  const name = clean(b.name, 120), email = clean(b.email, 160).toLowerCase(), phone = clean(b.phone, 40);
  const message = String(b.message ?? '').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').trim().slice(0, 2000);
  if (name.length < 2) errs.push('name');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errs.push('email');
  if (phone.replace(/\D/g, '').length < 10) errs.push('phone');
  const prop = b.property || {};
  const property = { id: clean(prop.id, 40), address: clean(prop.address, 200), title: clean(prop.title, 160), city: clean(prop.city, 60), price: Number(prop.price) || null, url: clean(prop.url, 300) };
  if (property.address.length < 4) errs.push('property');
  const slots = [];
  for (const s of Array.isArray(b.slots) ? b.slots.slice(0, 2) : []) {
    const date = clean(s?.date, 10), time = clean(s?.time, 5);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) continue;
    const start = detroitToUtc(date, time);
    if (isNaN(start) || start < Date.now() - 36e5 || start > Date.now() + 120 * 864e5) continue;
    slots.push({ date, time, start: start.toISOString(), end: new Date(+start + 45 * 6e4).toISOString() });
  }
  if (slots.length < 2) errs.push('slots');
  return { errs, data: { name, email, phone, message, property, slots } };
}

// Check the real file signature, not just the declared content type.
export function sniff(buf) {
  const b = Buffer.from(buf);
  if (b.subarray(0, 5).toString('latin1') === '%PDF-') return 'application/pdf';
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (b.subarray(4, 8).toString('latin1') === 'ftyp') {
    const brand = b.subarray(8, 12).toString('latin1');
    if (['heic', 'heix', 'hevc', 'heim', 'heis', 'hevm', 'hevs', 'mif1', 'msf1', 'heif'].includes(brand)) return 'image/heic';
  }
  return null;
}

/* ---------- spam protection ---------- */
export async function checkTurnstile(token, ip) {
  const secret = env('TURNSTILE_SECRET_KEY');
  if (!secret) return { ok: true, skipped: true };
  if (!token) return { ok: false };
  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: new URLSearchParams({ secret, response: token, ...(ip ? { remoteip: ip } : {}) })
  }).then(r => r.json()).catch(() => ({ success: false }));
  return { ok: !!r.success };
}
export const clientIp = req => (req.headers.get('x-forwarded-for') || '').split(',')[0].trim();
