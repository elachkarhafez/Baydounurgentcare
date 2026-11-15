// Notifications: business email (Resend) with an .ics invite, and Follow Up Boss.
import { env, fmtSlot, TZ } from './_lib.js';

const escHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const usd = n => n ? '$' + Math.round(n).toLocaleString('en-US') : '';

/* ---------- calendar invite ---------- */
const icsDate = iso => iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const icsText = s => String(s ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const fold = line => { const out = []; let s = line; while (Buffer.byteLength(s) > 74) { let i = 74; while (Buffer.byteLength(s.slice(0, i)) > 74) i--; out.push(s.slice(0, i)); s = ' ' + s.slice(i); } out.push(s); return out.join('\r\n'); };

export function buildIcs(r, { organizer, attendee, link }) {
  const [a, b] = r.slots;
  const desc = [
    `Showing request from ${r.name} (unconfirmed)`,
    `Phone: ${r.phone}`, `Email: ${r.email}`,
    `First choice: ${fmtSlot(a)}`, `Second choice: ${fmtSlot(b)}`,
    r.message ? `Message: ${r.message}` : '',
    link ? `Pre-approval letter (link expires in 7 days): ${link}` : 'No pre-approval letter attached.',
    'Confirm or reschedule from your dashboard.'
  ].filter(Boolean).join('\n');
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Mike Hakim Website//Showings//EN', 'CALSCALE:GREGORIAN', 'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:showing-${r.id}@mike-hakim-realtor`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${icsDate(a.start)}`, `DTEND:${icsDate(a.end)}`,
    `SUMMARY:${icsText(`Showing request: ${r.property.address} (${r.name})`)}`,
    `LOCATION:${icsText(r.property.address)}`,
    `DESCRIPTION:${icsText(desc)}`,
    'STATUS:TENTATIVE', 'TRANSP:OPAQUE', 'SEQUENCE:0',
    organizer ? `ORGANIZER;CN=Mike Hakim Website:mailto:${organizer}` : '',
    attendee ? `ATTENDEE;CN=Mike Hakim;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${attendee}` : '',
    'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Showing request', 'TRIGGER:-PT30M', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'
  ].filter(Boolean);
  return lines.map(fold).join('\r\n') + '\r\n';
}

/* ---------- email to Mike ---------- */
export async function sendEmail(r, { link, dashUrl }) {
  const apiKey = env('RESEND_API_KEY'), to = env('NOTIFY_EMAIL');
  if (!apiKey || !to) return { status: 'skipped', why: !apiKey ? 'RESEND_API_KEY not set' : 'NOTIFY_EMAIL not set' };
  const from = env('EMAIL_FROM') || 'Mike Hakim Website <onboarding@resend.dev>';
  const fromAddr = (from.match(/<([^>]+)>/) || [, from])[1];
  const [a, b] = r.slots;
  const row = (k, v) => v ? `<tr><td style="padding:8px 14px 8px 0;color:#687080;font:600 13px Arial;vertical-align:top;white-space:nowrap">${k}</td><td style="padding:8px 0;font:15px Arial;color:#0c1522">${v}</td></tr>` : '';
  const html = `<div style="background:#f6f3ec;padding:24px 12px"><div style="max-width:560px;margin:0 auto;background:#fffdf9;border-radius:16px;padding:26px 24px;border:1px solid #e5dfd2">
    <p style="margin:0;font:700 12px Arial;letter-spacing:.14em;text-transform:uppercase;color:#c49a45">New showing request</p>
    <h1 style="margin:10px 0 4px;font:600 22px Georgia,serif;color:#0c1522">${escHtml(r.property.address)}</h1>
    ${r.property.price ? `<p style="margin:0 0 14px;font:15px Arial;color:#687080">${escHtml(r.property.title || '')} · ${usd(r.property.price)}</p>` : ''}
    <table style="border-collapse:collapse;width:100%">
      ${row('Name', escHtml(r.name))}
      ${row('Phone', `<a href="tel:${escHtml(r.phone.replace(/[^\d+]/g, ''))}" style="color:#13253d">${escHtml(r.phone)}</a>`)}
      ${row('Email', `<a href="mailto:${escHtml(r.email)}" style="color:#13253d">${escHtml(r.email)}</a>`)}
      ${row('1st choice', `<b>${escHtml(fmtSlot(a))}</b>`)}
      ${row('2nd choice', escHtml(fmtSlot(b)))}
      ${row('Message', escHtml(r.message).replace(/\n/g, '<br>'))}
      ${row('Pre-approval', link ? `<a href="${escHtml(link)}" style="color:#13253d;font-weight:bold">Open the letter</a> <span style="color:#687080;font-size:13px">(${escHtml(r.letter.name)}, link works for 7 days)</span>` : 'Not attached')}
    </table>
    <p style="margin:18px 0 0;font:14px Arial;color:#3a4252">The first choice is on the attached calendar invite as tentative. Reply to this email to reach ${escHtml(r.name.split(' ')[0])} directly.</p>
    ${dashUrl ? `<p style="margin:16px 0 0"><a href="${escHtml(dashUrl)}" style="display:inline-block;background:#13253d;color:#fffdf9;padding:12px 18px;border-radius:999px;font:700 14px Arial;text-decoration:none">Open your dashboard</a></p>` : ''}
    <p style="margin:18px 0 0;font:12px Arial;color:#8a909c">Letters are stored privately and deleted automatically after 90 days. Times are Detroit time.</p>
  </div></div>`;
  const text = [`New showing request: ${r.property.address}`, `Name: ${r.name}`, `Phone: ${r.phone}`, `Email: ${r.email}`, `1st choice: ${fmtSlot(a)}`, `2nd choice: ${fmtSlot(b)}`, r.message ? `Message: ${r.message}` : '', link ? `Pre-approval letter (7 days): ${link}` : 'Pre-approval: not attached', dashUrl ? `Dashboard: ${dashUrl}` : ''].filter(Boolean).join('\n');
  const ics = buildIcs(r, { organizer: fromAddr, attendee: to.split(',')[0].trim(), link });
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from, to: to.split(',').map(s => s.trim()).filter(Boolean), reply_to: r.email,
      subject: `Showing request: ${r.property.address} · ${fmtSlot(a)}`,
      html, text,
      attachments: [{ filename: 'showing.ics', content: Buffer.from(ics).toString('base64'), content_type: 'text/calendar; method=REQUEST; charset=UTF-8' }]
    })
  });
  const body = await res.json().catch(() => ({}));
  return res.ok ? { status: 'sent', id: body.id } : { status: 'failed', code: res.status, why: body.message || body.name || 'error' };
}

/* ---------- Follow Up Boss ---------- */
const FUB = 'https://api.followupboss.com/v1';
function fubHeaders() {
  const h = { authorization: 'Basic ' + Buffer.from(env('FUB_API_KEY') + ':').toString('base64'), 'content-type': 'application/json', accept: 'application/json', 'X-System': env('FUB_SYSTEM') || 'MikeHakimWebsite' };
  if (env('FUB_SYSTEM_KEY')) h['X-System-Key'] = env('FUB_SYSTEM_KEY');
  return h;
}
function splitAddress(addr) {
  // "123 Main St, Dearborn, MI 48126" → parts; free text falls back to street only.
  const p = addr.split(',').map(s => s.trim());
  const zip = (addr.match(/\b\d{5}\b/) || [''])[0];
  return { street: p[0] || addr, city: p[1] || '', state: 'MI', code: zip };
}

export async function sendFub(r, { link, siteUrl }) {
  if (!env('FUB_API_KEY')) return { status: 'skipped', why: 'FUB_API_KEY not set' };
  const [a, b] = r.slots;
  const [firstName, ...rest] = r.name.split(/\s+/);
  const message = [
    `Showing request from the website.`,
    `1st choice: ${fmtSlot(a)} (Detroit time)`,
    `2nd choice: ${fmtSlot(b)} (Detroit time)`,
    r.message ? `Message: ${r.message}` : '',
    link ? `Pre-approval letter (private link, expires in 7 days; also in the website dashboard): ${link}` : 'No pre-approval letter attached.'
  ].filter(Boolean).join('\n');
  // Listings from his posts have no street number yet, so send the title as the street and the real city.
  const addr = r.property.city ? { street: r.property.title || r.property.address, city: r.property.city, state: 'MI', code: '' } : splitAddress(r.property.address);
  const event = {
    source: env('FUB_SOURCE') || 'mike-hakim-realtor.vercel.app',
    system: 'Mike Hakim Website',
    type: 'Property Inquiry',
    message,
    description: `Requested showing times: ${fmtSlot(a)} or ${fmtSlot(b)}`,
    person: { firstName, lastName: rest.join(' '), emails: [{ value: r.email }], phones: [{ value: r.phone, type: 'mobile' }], tags: ['Showing request', 'Website'] },
    property: { ...addr, ...(r.property.price ? { price: r.property.price } : {}), ...(r.property.url ? { url: r.property.url } : {}) },
    pageUrl: siteUrl, pageTitle: 'Mike Hakim · Request a showing'
  };
  const out = {};
  const er = await fetch(`${FUB}/events`, { method: 'POST', headers: fubHeaders(), body: JSON.stringify(event) });
  const ej = await er.json().catch(() => ({}));
  if (!er.ok) return { status: 'failed', code: er.status, why: ej.errorMessage || ej.message || 'error' };
  out.status = er.status === 204 ? 'ignored (lead flow archived)' : 'sent';
  out.code = er.status;
  const personId = ej.id && ej.firstName !== undefined ? ej.id : (ej.personId || ej.person?.id);
  out.personId = personId || null;

  // Appointment at the first choice. It syncs to Mike's Google Calendar only if
  // he is an invitee and has calendar sync turned on in Follow Up Boss.
  if (env('FUB_APPOINTMENTS') !== 'off' && personId) {
    try {
      const me = await fetch(`${FUB}/me`, { headers: fubHeaders() }).then(x => x.ok ? x.json() : null);
      const invitees = [{ personId, name: r.name, email: r.email }];
      if (me?.id) invitees.unshift({ userId: me.id, name: me.name || 'Mike Hakim' });
      const ap = await fetch(`${FUB}/appointments`, {
        method: 'POST', headers: fubHeaders(),
        body: JSON.stringify({ title: `Showing request (unconfirmed): ${r.property.address}`, start: a.start, end: a.end, location: r.property.address, description: message, invitees })
      });
      const aj = await ap.json().catch(() => ({}));
      out.appointment = ap.ok ? { status: 'created', id: aj.id } : { status: 'failed', code: ap.status, why: aj.errorMessage || aj.message || 'error' };
    } catch (e) { out.appointment = { status: 'failed', why: e.message }; }
  }
  return out;
}
export { TZ };
