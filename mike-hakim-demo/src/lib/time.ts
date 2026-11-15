import { TIMEZONE } from "@/config/demo";

const pad = (n: number) => String(n).padStart(2, "0");

/** Wall-clock parts of an instant in Detroit time. */
export function detroitParts(d: Date | string | number) {
  const date = new Date(d);
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TIMEZONE,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "short",
    })
      .formatToParts(date)
      .map((x) => [x.type, x.value]),
  );
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour, min: +p.minute, weekday: p.weekday as string };
}

/** YYYY-MM-DD of an instant in Detroit. */
export function detroitYmd(d: Date | string | number = Date.now()) {
  const p = detroitParts(d);
  return `${p.y}-${pad(p.m)}-${pad(p.d)}`;
}

/** Convert a Detroit wall-clock date + time to a UTC Date (handles DST). */
export function detroitToUtc(ymd: string, hm: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  const [hh, mm] = hm.split(":").map(Number);
  const target = Date.UTC(y, m - 1, d, hh, mm);
  let guess = target;
  for (let i = 0; i < 3; i++) {
    const p = detroitParts(guess);
    const seen = Date.UTC(p.y, p.m - 1, p.d, p.h, p.min);
    guess += target - seen;
  }
  return new Date(guess);
}

export function addDaysYmd(ymd: string, n: number) {
  const [y, m, d] = ymd.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** A plain JS Date (local midnight) for a YYYY-MM-DD, used by the date picker. */
export function ymdToLocalDate(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}
export function localDateToYmd(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { timeZone: TIMEZONE, ...o });

export const formatDateLong = (d: Date | string) => fmt({ weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date(d));
export const formatDate = (d: Date | string) => fmt({ weekday: "short", month: "short", day: "numeric" }).format(new Date(d));
export const formatTime = (d: Date | string) => fmt({ hour: "numeric", minute: "2-digit" }).format(new Date(d));
export const formatDateTime = (d: Date | string) => `${formatDate(d)}, ${formatTime(d)}`;
export const formatTz = (d: Date | string) =>
  fmt({ timeZoneName: "short" }).formatToParts(new Date(d)).find((p) => p.type === "timeZoneName")?.value ?? "ET";

/** "9:30 AM" label for an HH:mm string. */
export function hmLabel(hm: string) {
  const [h, m] = hm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${pad(m)} ${h < 12 ? "AM" : "PM"}`;
}

/** Label for a YYYY-MM-DD without timezone drift. */
export function ymdLabel(ymd: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" }) {
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...opts }).format(new Date(ymd + "T12:00:00Z"));
}

export function relativeTime(iso: string, now = Date.now()) {
  const s = Math.round((now - new Date(iso).getTime()) / 1000);
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} day${d === 1 ? "" : "s"} ago`;
  return formatDate(iso);
}

export function makeSlot(date: string, time: string, minutes = 45) {
  const start = detroitToUtc(date, time);
  return { date, time, start: start.toISOString(), end: new Date(+start + minutes * 60000).toISOString() };
}
