import { detroitParts, detroitToUtc, ymdToLocalDate } from "@/lib/time";

/** SAMPLE availability. Not Mike's real calendar. */
export function slotsFor(ymd: string) {
  const dow = ymdToLocalDate(ymd).getDay();
  const startH = dow === 0 ? 12 : 9;
  const endH = dow === 0 ? 17 : 19;
  const hash = ymd.split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 9973, 7);
  const out: { time: string; taken: boolean; past: boolean }[] = [];
  for (let h = startH; h < endH; h++) {
    for (const m of [0, 30]) {
      const time = `${String(h).padStart(2, "0")}:${m ? "30" : "00"}`;
      const idx = out.length;
      const taken = (hash + idx * 7) % 9 === 0 || (hash + idx * 5) % 11 === 0;
      const past = detroitToUtc(ymd, time).getTime() < Date.now() + 60 * 60 * 1000;
      out.push({ time, taken, past });
    }
  }
  return out;
}
export const nowDetroit = () => detroitParts(Date.now());
