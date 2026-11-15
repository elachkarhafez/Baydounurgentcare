import { env, json } from './_lib.js';
// Public, non-secret settings for the form.
export function GET() {
  return json({ turnstileSiteKey: env('TURNSTILE_SITE_KEY') || null, maxBytes: 10 * 1024 * 1024 });
}
