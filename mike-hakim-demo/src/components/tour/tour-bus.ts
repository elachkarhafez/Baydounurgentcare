/**
 * Tiny bus so the tour can drive the wizard without tight coupling.
 * Actions nobody handles yet (the next page is still loading) are queued for
 * a few seconds and replayed to the next listener that subscribes.
 */
export type TourAction =
  | { type: "open-wizard"; listingId: string; step?: number; sample?: boolean }
  | { type: "wizard-step"; step: number }
  | { type: "wizard-sample-doc" }
  | { type: "wizard-submit" }
  | { type: "close-wizard" };

type Handler = (a: TourAction) => boolean | void;
const handlers = new Set<Handler>();
let queue: { a: TourAction; at: number }[] = [];
const TTL = 10_000;

export function emitTour(a: TourAction) {
  let handled = false;
  handlers.forEach((h) => { if (h(a)) handled = true; });
  if (!handled && a.type !== "close-wizard") queue.push({ a, at: Date.now() });
}

/** Return true from the handler when it acted on the action. */
export function onTour(fn: Handler) {
  handlers.add(fn);
  const now = Date.now();
  queue = queue.filter((q) => now - q.at < TTL);
  const pending = queue;
  queue = [];
  // replay in order; anything this handler doesn't take stays queued
  pending.forEach((q) => { if (!fn(q.a)) queue.push(q); });
  return () => { handlers.delete(fn); };
}

export interface Submitted { ref: string; showingId: string; leadId: string }
export const emitSubmitted = (d: Submitted) => window.dispatchEvent(new CustomEvent("mh-submitted", { detail: d }));
export function onSubmitted(fn: (d: Submitted) => void) {
  const h = (e: Event) => fn((e as CustomEvent<Submitted>).detail);
  window.addEventListener("mh-submitted", h);
  return () => window.removeEventListener("mh-submitted", h);
}
