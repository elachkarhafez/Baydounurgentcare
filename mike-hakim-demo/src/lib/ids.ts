const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function uid(prefix = "") {
  const r = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().replace(/-/g, "").slice(0, 12) : Math.random().toString(36).slice(2, 14);
  return prefix + r;
}
export function refCode() {
  let s = "";
  for (let i = 0; i < 6; i++) s += ALPHA[Math.floor(Math.random() * ALPHA.length)];
  return `SR-${s}`;
}
/** Deterministic pseudo-random generator for seeding. */
export function seeded(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
