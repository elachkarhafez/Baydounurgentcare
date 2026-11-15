"use client";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TOUR_LISTING_ID } from "@/data/listings";
import { emitTour, onSubmitted, type Submitted } from "@/components/tour/tour-bus";
import { getState } from "@/lib/store";
import { session } from "@/lib/storage";

interface Step {
  title: string;
  body: string;
  route: (ctx: Ctx) => string;
  target?: string;
  enter?: (ctx: Ctx) => void;
  /** Custom "Next": return a promise that resolves when it's safe to advance. */
  next?: (ctx: Ctx) => Promise<void>;
}
interface Ctx { last: Submitted | null }

const L = `/homes/${TOUR_LISTING_ID}`;
const STEPS: Step[] = [
  { title: "Search the way buyers already do", body: "Buyers type a city, ZIP or street and the results update instantly. In production this search runs on Mike's authorized IDX feed. Here it uses 30 sample listings.", route: () => "/homes", target: "search" },
  { title: "MLS-style filters", body: "Price, beds, baths, property type, square footage, status and open houses all combine. We've applied Dearborn with 3+ beds so you can see the results narrow.", route: () => "/homes?q=Dearborn&beds=3", target: "filters" },
  { title: "A full listing page", body: "Each home gets a gallery with fullscreen view, specs, a map, a mortgage calculator and similar homes, all on one page.", route: () => L, target: "gallery" },
  { title: "Request a showing", body: "Buyers pick a date and a time slot in Detroit time, plus an optional backup time. We've filled in a fictional sample buyer so you don't have to type anything.", route: () => L, target: "wizard-datetime", enter: () => emitTour({ type: "open-wizard", listingId: TOUR_LISTING_ID, step: 1, sample: true }) },
  { title: "Attach a pre-approval letter", body: "Buyers can drag in a PDF, JPG or PNG. The demo attaches a generated sample file and only keeps its name, type and size. The file itself is never stored.", route: () => L, target: "wizard-upload", enter: () => { emitTour({ type: "wizard-step", step: 3 }); setTimeout(() => emitTour({ type: "wizard-sample-doc" }), 350); } },
  { title: "Review and submit", body: "Everything is checked before it's sent. Press Next and we'll submit this sample request for you.", route: () => L, target: "wizard-submit", enter: () => emitTour({ type: "wizard-step", step: 4 }),
    next: () => new Promise<void>((resolve) => { const off = onSubmitted(() => { off(); resolve(); }); emitTour({ type: "wizard-submit" }); setTimeout(() => { off(); resolve(); }, 6000); }) },
  { title: "Watch the automation run", body: "The request is recorded, then an email notification, a Follow Up Boss lead and a tentative calendar hold are created. Each one is clearly marked as a simulation; nothing leaves the browser.", route: (c) => (c.last ? `/requests/${c.last.ref}` : "/dashboard/automations"), target: "automation", enter: () => emitTour({ type: "close-wizard" }) },
  { title: "Mike's dashboard", body: "Counts, recent requests and the activity feed update the moment a buyer submits. This is the Realtor View.", route: () => "/dashboard", target: "metrics" },
  { title: "The new lead, ready to work", body: "Open the lead to see contact details, financing, the property, the simulated CRM sync and the email. Change the stage or add a note right here.", route: (c) => (c.last ? `/dashboard/leads?lead=${c.last.leadId}` : "/dashboard/leads"), target: "lead-detail" },
  { title: "Tentative on the calendar", body: "The showing lands on the calendar as tentative until Mike confirms it. He can confirm, reschedule or cancel, and the request updates with it.", route: (c) => { const e = c.last && getState().events.find((x) => x.showingId === c.last!.showingId); return e ? `/dashboard/calendar?event=${e.id}` : "/dashboard/calendar"; }, target: "event-detail" },
];

interface TourApi { active: boolean; index: number; start: () => void; stop: () => void }
const TourCtx = createContext<TourApi>({ active: false, index: 0, start: () => {}, stop: () => {} });
export const useTour = () => useContext(TourCtx);

const KEY = "mh-tour";

export function TourProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [index, setIndex] = useState(-1);
  const [busy, setBusy] = useState(false);
  const last = useRef<Submitted | null>(null);

  useEffect(() => {
    const saved = session.get(KEY);
    if (saved) {
      try { const v = JSON.parse(saved); last.current = v.last ?? null; setIndex(v.index ?? -1); } catch {}
    }
    return onSubmitted((d) => { last.current = d; });
  }, []);
  useEffect(() => { if (index >= 0) session.set(KEY, JSON.stringify({ index, last: last.current })); else session.remove(KEY); }, [index]);

  const go = useCallback((i: number) => {
    if (i < 0 || i >= STEPS.length) { setIndex(-1); emitTour({ type: "close-wizard" }); return; }
    const step = STEPS[i];
    const url = step.route({ last: last.current });
    setIndex(i);
    const cur = window.location.pathname + window.location.search;
    if (cur !== url) router.push(url, { scroll: false });
    if (step.enter) setTimeout(() => step.enter!({ last: last.current }), cur !== url ? 650 : 120);
  }, [router]);

  const start = useCallback(() => { last.current = null; try { sessionStorage.setItem("mh-intro", "1"); } catch {}; go(0); }, [go]);
  const stop = useCallback(() => { setIndex(-1); emitTour({ type: "close-wizard" }); }, []);
  const next = useCallback(async () => {
    const step = STEPS[index];
    if (step?.next) { setBusy(true); await step.next({ last: last.current }); setBusy(false); }
    go(index + 1);
  }, [index, go]);

  const api = useMemo(() => ({ active: index >= 0, index, start, stop }), [index, start, stop]);
  return (
    <TourCtx.Provider value={api}>
      {children}
      <AnimatePresence>{index >= 0 && <TourOverlay key="tour" step={STEPS[index]} index={index} total={STEPS.length} path={path} busy={busy} onNext={next} onPrev={() => go(index - 1)} onClose={stop} />}</AnimatePresence>
    </TourCtx.Provider>
  );
}

function useTargetRect(target: string | undefined, dep: unknown) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  useLayoutEffect(() => {
    setRect(null);
    if (!target) return;
    let raf = 0, scrolled = false;
    const tick = () => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${target}"]`);
      if (el) {
        const r = el.getBoundingClientRect();
        if (r.width > 0) {
          if (!scrolled) {
            scrolled = true;
            const vh = window.innerHeight;
            if (r.top < 70 || r.bottom > vh - 40) el.scrollIntoView({ block: r.height > vh * 0.6 ? "start" : "center", behavior: "smooth" });
          }
          setRect((prev) => (prev && Math.abs(prev.top - r.top) < 0.5 && Math.abs(prev.left - r.left) < 0.5 && Math.abs(prev.width - r.width) < 0.5 && Math.abs(prev.height - r.height) < 0.5 ? prev : r));
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, dep]);
  return rect;
}

function TourOverlay({ step, index, total, path, busy, onNext, onPrev, onClose }: { step: Step; index: number; total: number; path: string; busy: boolean; onNext: () => void; onPrev: () => void; onClose: () => void }) {
  const rect = useTargetRect(step.target, `${index}-${path}`);
  const [vw, setVw] = useState(1200);
  const [vh, setVh] = useState(800);
  useEffect(() => {
    const on = () => { setVw(window.innerWidth); setVh(window.innerHeight); };
    on();
    window.addEventListener("resize", on);
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", key);
    return () => { window.removeEventListener("resize", on); window.removeEventListener("keydown", key); };
  }, [onClose]);
  const pad = 8;
  const mobile = vw < 640;
  const cardW = Math.min(380, vw - 24);
  let style: React.CSSProperties;
  if (mobile || !rect) {
    const top = rect ? rect.top + rect.height / 2 > vh * 0.55 : false;
    style = { left: 12, right: 12, ...(top ? { top: 12 } : { bottom: 12 }) };
  } else {
    const below = rect.bottom + 16 + 230 < vh;
    const left = Math.min(Math.max(12, rect.left), vw - cardW - 12);
    style = below ? { top: rect.bottom + 14, left, width: cardW } : { top: Math.max(12, rect.top - 14 - 240), left, width: cardW };
  }
  return (
    <motion.div className="pointer-events-none fixed inset-0 z-[150]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} data-tour-overlay>
      {rect ? (
        <motion.div
          className="absolute rounded-lg ring-2 ring-gold"
          style={{ boxShadow: "0 0 0 9999px rgba(13,22,36,.5)" }}
          initial={false}
          animate={{ top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }}
          transition={{ type: "spring", stiffness: 260, damping: 30 }}
        />
      ) : (
        <div className="absolute inset-0 bg-ink/40" />
      )}
      <motion.div
        key={index}
        role="dialog"
        aria-label={`Demo tour step ${index + 1} of ${total}`}
        className="pointer-events-auto absolute rounded-lg border border-border bg-card p-5 shadow-lift"
        style={style}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-start justify-between gap-3">
          <span className="eyebrow inline-flex items-center gap-1.5"><Sparkles className="size-3.5" /> Demo tour · {index + 1} of {total}</span>
          <button onClick={onClose} className="-m-1 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Skip tour"><X className="size-4" /></button>
        </div>
        <h2 className="mt-2 text-[20px] font-medium leading-tight">{step.title}</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{step.body}</p>
        <div className="mt-4 flex items-center gap-1" aria-hidden>
          {Array.from({ length: total }).map((_, i) => (
            <span key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= index ? "bg-gold" : "bg-border"}`} />
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Skip tour</Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onPrev} disabled={index === 0 || busy}><ArrowLeft /> Back</Button>
            <Button size="sm" onClick={onNext} disabled={busy} data-tour-next>
              {busy ? "Submitting…" : index === total - 1 ? "Finish" : "Next"} {!busy && index < total - 1 && <ArrowRight />}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
