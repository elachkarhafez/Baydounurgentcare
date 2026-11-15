"use client";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TOUR_LISTING_ID } from "@/data/listings";
import { emitTour, onSubmitted, type Submitted } from "@/components/tour/tour-bus";
import { getState } from "@/lib/store";
import { session } from "@/lib/storage";

interface Step {
  title: string;
  body: string;
  /** null = stay on the current page */
  route: ((ctx: Ctx) => string) | null;
  target?: string;
  /** Centered card with no spotlight (welcome and finish). */
  center?: boolean;
  bullets?: string[];
  nextLabel?: string;
  enter?: (ctx: Ctx) => void;
  /** Custom "Next": return a promise that resolves when it's safe to advance. */
  next?: (ctx: Ctx) => Promise<void>;
}
interface Ctx { last: Submitted | null }

const L = `/homes/${TOUR_LISTING_ID}`;
const STEPS: Step[] = [
  { center: true, route: () => "/", title: "Here's what your new website does for you", body: "This takes about two minutes. We'll play a buyer, send you a showing request, and then switch to your side to see where it lands. Just press the button and follow along.",
    bullets: ["Buyers find homes and book showings on their own, any time of day", "Every request reaches your email, Follow Up Boss and your calendar automatically", "Pre-approval letters come attached, so you know who's serious"], nextLabel: "Start" },
  { title: "Buyers search your listings", body: "They type a city or ZIP and narrow it down by price, beds, baths and more. We searched Dearborn with 3+ bedrooms for you.", route: () => "/homes?q=Dearborn&beds=3", target: "filters" },
  { title: "Every home gets a full page", body: "Photos, details, a map and a monthly payment estimate. And right there, a button to book a showing with you.", route: () => L, target: "request-showing" },
  { title: "They pick a time that works", body: "Buyers choose a day and a time, plus a backup. You never have to play phone tag to set it up. We filled in a sample buyer for you.", route: () => L, target: "wizard-datetime", enter: () => emitTour({ type: "open-wizard", listingId: TOUR_LISTING_ID, step: 1, sample: true }) },
  { title: "Pre-approval comes with it", body: "Buyers attach their pre-approval letter right in the request, so you know who's ready before you ever leave the office.", route: () => L, target: "wizard-upload", enter: () => { emitTour({ type: "wizard-step", step: 3 }); setTimeout(() => emitTour({ type: "wizard-sample-doc" }), 350); } },
  { title: "One tap to send", body: "They check everything and hit submit. Press Send and we'll send this sample request to you.", route: () => L, target: "wizard-submit", nextLabel: "Send", enter: () => emitTour({ type: "wizard-step", step: 4 }),
    next: () => new Promise<void>((resolve) => { const off = onSubmitted(() => { off(); resolve(); }); emitTour({ type: "wizard-submit" }); setTimeout(() => { off(); resolve(); }, 6000); }) },
  { title: "Now watch what happens for you", body: "Within seconds you get an email, the buyer is added to Follow Up Boss, and the showing goes on your calendar. Nobody has to type anything in.", route: (c) => (c.last ? `/requests/${c.last.ref}` : "/dashboard"), target: "automation", enter: () => emitTour({ type: "close-wizard" }) },
  { title: "The email you'd get", body: "Every detail in one place: who it is, which home, when they want to see it, how they're paying, and their pre-approval.", route: null, target: "email-preview" },
  { title: "Your dashboard", body: "This is your side. New requests, upcoming showings and buyers who need a follow-up, all on one screen.", route: () => "/dashboard", target: "metrics" },
  { title: "The buyer, ready to call", body: "Their number, what they're looking at and how they're financing. Move them along your pipeline or add a note.", route: (c) => (c.last ? `/dashboard/leads?lead=${c.last.leadId}` : "/dashboard/leads"), target: "lead-detail" },
  { title: "On your calendar", body: "It shows up as tentative until you confirm it. Confirm, move or cancel it in one tap.", route: (c) => { const e = c.last && getState().events.find((x) => x.showingId === c.last!.showingId); return e ? `/dashboard/calendar?event=${e.id}` : "/dashboard/calendar"; }, target: "event-detail" },
  { center: true, route: null, title: "That's the whole thing", body: "A buyer found a home, booked a showing and sent their pre-approval. You got the email, the lead and the calendar hold without lifting a finger.",
    bullets: ["Works on phones as well as it does here", "Built around the tools you already use", "Your branding, your listings, your phone number"], nextLabel: "Done" },
];
// Center cards aren't counted in the "Step x of y" label.
const COUNTED = STEPS.filter((s) => !s.center).length;
const stepNumber = (i: number) => STEPS.slice(0, i + 1).filter((s) => !s.center).length;

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
    const cur = window.location.pathname + window.location.search;
    const url = step.route ? step.route({ last: last.current }) : cur;
    setIndex(i);
    if (cur !== url) router.push(url, { scroll: false });
    if (step.enter) setTimeout(() => step.enter!({ last: last.current }), cur !== url ? 650 : 120);
  }, [router]);

  const start = useCallback(() => { last.current = null; try { sessionStorage.setItem("mh-intro", "1"); } catch {}; window.scrollTo({ top: 0 }); go(0); }, [go]);
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
      <AnimatePresence>{index >= 0 && <TourOverlay key="tour" step={STEPS[index]} index={index} total={STEPS.length} path={path} busy={busy} onNext={next} onPrev={() => go(index - 1)} onClose={stop} onRestart={start} />}</AnimatePresence>
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

function TourOverlay({ step, index, total, path, busy, onNext, onPrev, onClose, onRestart }: { step: Step; index: number; total: number; path: string; busy: boolean; onNext: () => void; onPrev: () => void; onClose: () => void; onRestart: () => void }) {
  const rect = useTargetRect(step.center ? undefined : step.target, `${index}-${path}`);
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
  if (step.center) {
    style = { inset: 0, margin: "auto", height: "fit-content", width: Math.min(520, vw - 24), maxHeight: "calc(100dvh - 24px)", overflowY: "auto" };
  } else if (mobile || !rect) {
    const top = rect ? rect.top + rect.height / 2 > vh * 0.55 : false;
    style = { left: 12, right: 12, maxHeight: "min(60dvh, 420px)", overflowY: "auto", ...(top ? { top: 12 } : { bottom: 12 }) };
  } else {
    const below = rect.bottom + 16 + 230 < vh;
    const left = Math.min(Math.max(12, rect.left), vw - cardW - 12);
    style = below ? { top: rect.bottom + 14, left, width: cardW } : { top: Math.max(12, rect.top - 14 - 240), left, width: cardW };
  }
  return (
    <motion.div className="pointer-events-none fixed inset-0 z-[150]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} data-tour-overlay>
      {step.center ? <div className="absolute inset-0 bg-ink/60 backdrop-blur-[2px]" /> : rect ? (
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
          <span className="eyebrow inline-flex items-center gap-1.5"><Sparkles className="size-3.5" /> {step.center ? (index === 0 ? "Guided demo" : "Finished") : `Step ${stepNumber(index)} of ${COUNTED}`}</span>
          <button onClick={onClose} className="-m-1 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Exit the guided demo"><X className="size-4" /></button>
        </div>
        <h2 className={`mt-2 font-medium leading-tight ${step.center ? "text-[26px]" : "text-[20px]"}`}>{step.title}</h2>
        <p className="mt-2 text-[14.5px] leading-relaxed text-muted-foreground">{step.body}</p>
        {step.bullets && <ul className="mt-4 grid gap-2.5">{step.bullets.map((b) => <li key={b} className="flex gap-2.5 text-[14.5px] font-medium"><Check className="mt-0.5 size-4 shrink-0 text-gold" />{b}</li>)}</ul>}
        <div className="mt-4 flex items-center gap-1" aria-hidden>
          {Array.from({ length: COUNTED }).map((_, i) => (
            <span key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < stepNumber(index) ? "bg-gold" : "bg-border"}`} />
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between gap-2">
          {index === total - 1 ? <Button variant="ghost" size="sm" onClick={onRestart}>Run it again</Button> : <Button variant="ghost" size="sm" onClick={onClose}>Exit</Button>}
          <div className="flex gap-2">
            {index > 0 && index < total - 1 && <Button variant="outline" size="sm" onClick={onPrev} disabled={busy}><ArrowLeft /> Back</Button>}
            <Button size={step.center ? "lg" : "sm"} variant={step.center ? "gold" : "default"} onClick={onNext} disabled={busy} data-tour-next>
              {busy ? "Sending…" : step.nextLabel ?? "Next"} {!busy && index < total - 1 && <ArrowRight />}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
