/** Tiny event bus so the tour can drive the wizard without tight coupling. */
export type TourAction =
  | { type: "open-wizard"; listingId: string; step?: number; sample?: boolean }
  | { type: "wizard-step"; step: number }
  | { type: "wizard-sample-doc" }
  | { type: "wizard-submit" }
  | { type: "close-wizard" };

export const emitTour = (a: TourAction) => window.dispatchEvent(new CustomEvent("mh-tour", { detail: a }));
export function onTour(fn: (a: TourAction) => void) {
  const h = (e: Event) => fn((e as CustomEvent<TourAction>).detail);
  window.addEventListener("mh-tour", h);
  return () => window.removeEventListener("mh-tour", h);
}

export interface Submitted { ref: string; showingId: string; leadId: string }
export const emitSubmitted = (d: Submitted) => window.dispatchEvent(new CustomEvent("mh-submitted", { detail: d }));
export function onSubmitted(fn: (d: Submitted) => void) {
  const h = (e: Event) => fn((e as CustomEvent<Submitted>).detail);
  window.addEventListener("mh-submitted", h);
  return () => window.removeEventListener("mh-submitted", h);
}
