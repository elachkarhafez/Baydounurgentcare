/** localStorage wrapper that never throws (private mode, blocked storage, SSR). */
const memory = new Map<string, string>();
function ls(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    const s = window.localStorage;
    const k = "__mh_probe__";
    s.setItem(k, "1");
    s.removeItem(k);
    return s;
  } catch {
    return null;
  }
}
export const safeStorage = {
  get(key: string): string | null {
    const s = ls();
    try {
      return s ? s.getItem(key) : memory.get(key) ?? null;
    } catch {
      return memory.get(key) ?? null;
    }
  },
  set(key: string, value: string) {
    memory.set(key, value);
    const s = ls();
    try {
      s?.setItem(key, value);
    } catch {
      /* quota or blocked: memory copy still works for this session */
    }
  },
  remove(key: string) {
    memory.delete(key);
    try {
      ls()?.removeItem(key);
    } catch {}
  },
  persistent: () => ls() !== null,
};
export const session = {
  get(key: string) {
    try {
      return typeof window === "undefined" ? null : window.sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, v: string) {
    try {
      window.sessionStorage.setItem(key, v);
    } catch {}
  },
  remove(key: string) {
    try {
      window.sessionStorage.removeItem(key);
    } catch {}
  },
};
