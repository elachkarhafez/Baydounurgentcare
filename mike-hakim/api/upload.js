import { handleUpload } from '@vercel/blob/client';
import { json, verify, MAX_BYTES, TYPES, LETTER_TTL_DAYS } from './_lib.js';
// Step 2: the browser uploads the letter straight to the PRIVATE blob store.
// The token is only issued for a valid ticket, under letters/<ticket id>/, with type and size limits.
export async function POST(req) {
  let body; try { body = await req.json(); } catch { return json({ error: 'bad request' }, 400); }
  try {
    const res = await handleUpload({
      body, request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const t = verify(clientPayload);
        if (!t) throw new Error('Your session expired. Please try again.');
        const ext = (pathname.split('.').pop() || '').toLowerCase();
        if (!pathname.startsWith(`letters/${t.id}/`) || !Object.values(TYPES).concat('jpeg').includes(ext)) throw new Error('That file type is not allowed.');
        return { allowedContentTypes: Object.keys(TYPES), maximumSizeInBytes: MAX_BYTES, addRandomSuffix: true, allowOverwrite: false, ttlDays: LETTER_TTL_DAYS, validUntil: Date.now() + 10 * 6e4 };
      }
    });
    return json(res);
  } catch (e) { return json({ error: e.message }, 400); }
}
