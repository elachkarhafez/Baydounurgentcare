"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, ExternalLink, MapPin, UserRound, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useDemoState } from "@/lib/use-demo";
import { rescheduleEvent, setEventStatus } from "@/lib/store";
import { getListing } from "@/data/listings";
import { addDaysYmd, detroitParts, detroitYmd, formatDateLong, formatTime, formatTz, ymdLabel, ymdToLocalDate } from "@/lib/time";
import { DashSkeleton, PageHead, ShowingBadge } from "@/components/dashboard/bits";
import { RescheduleDialog } from "@/components/dashboard/reschedule-dialog";
import type { CalendarEvent } from "@/lib/types";
import { cn } from "cn";
import { useTour } from "@/components/tour/tour-provider";

type View = "month" | "week" | "day";
const HOURS = Array.from({ length: 13 }, (_, i) => 8 + i); // 8am to 8pm
const HOUR_PX = 56;

function tone(e: CalendarEvent) {
  if (e.status === "cancelled") return "border-border bg-muted text-muted-foreground line-through";
  if (e.status === "tentative") return "border-dashed border-amber-500 bg-amber-50 text-amber-950";
  if (e.kind === "open_house") return "border-gold bg-gold/15 text-[#5c4520]";
  if (e.kind === "appointment") return "border-sky-300 bg-sky-50 text-sky-950";
  return "border-emerald/40 bg-emerald/10 text-emerald";
}
const startOfWeek = (ymd: string) => addDaysYmd(ymd, -ymdToLocalDate(ymd).getDay());

function EventChip({ e, onOpen, compact }: { e: CalendarEvent; onOpen: (id: string) => void; compact?: boolean }) {
  return (
    <button onClick={() => onOpen(e.id)} className={cn("w-full truncate rounded border px-1.5 py-0.5 text-left text-[11.5px] font-semibold transition hover:brightness-95", tone(e))} data-event={e.id} title={e.title}>
      {!compact && <span className="mr-1 tabular opacity-80">{formatTime(e.start).replace(":00", "").replace(" ", "").toLowerCase()}</span>}{e.title.replace("Showing Requested: ", "Requested: ")}
    </button>
  );
}

export function CalendarPage() {
  const s = useDemoState();
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const today = detroitYmd();
  const [view, setView] = useState<View>("month");
  const [anchor, setAnchor] = useState(today);
  const [resched, setResched] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const tour = useTour();
  const openId = params.get("event");
  const evt = s?.events.find((e) => e.id === openId) ?? null;

  useEffect(() => { if (window.innerWidth < 640) setView("day"); }, []);
  useEffect(() => { if (evt) setAnchor(detroitYmd(evt.start)); }, [evt?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const byDay = useMemo(() => {
    const m = new Map<string, CalendarEvent[]>();
    (s?.events ?? []).forEach((e) => { const d = detroitYmd(e.start); m.set(d, [...(m.get(d) ?? []), e]); });
    m.forEach((arr) => arr.sort((a, b) => a.start.localeCompare(b.start)));
    return m;
  }, [s?.events]);
  if (!s) return <DashSkeleton />;

  const open = (id: string | null) => { const p = new URLSearchParams(params.toString()); if (id) p.set("event", id); else p.delete("event"); router.replace(`${path}?${p}`, { scroll: false }); };
  const step = (d: number) => { const [y, m] = anchor.split("-").map(Number); if (view === "month") { const t = new Date(Date.UTC(y, m - 1 + d, 1)); setAnchor(`${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-01`); } else setAnchor(addDaysYmd(anchor, d * (view === "week" ? 7 : 1))); };
  const [ay, am] = anchor.split("-").map(Number);
  const title = view === "month" ? ymdLabel(`${ay}-${String(am).padStart(2, "0")}-01`, { month: "long", year: "numeric" }) : view === "week" ? `Week of ${ymdLabel(startOfWeek(anchor), { month: "short", day: "numeric", year: "numeric" })}` : ymdLabel(anchor, { weekday: "long", month: "long", day: "numeric" });

  const monthStart = startOfWeek(`${ay}-${String(am).padStart(2, "0")}-01`);
  const monthDays = Array.from({ length: 42 }, (_, i) => addDaysYmd(monthStart, i));
  const weekDays = view === "week" ? Array.from({ length: 7 }, (_, i) => addDaysYmd(startOfWeek(anchor), i)) : [anchor];
  const sh = evt?.showingId ? s.showings.find((x) => x.id === evt.showingId) : undefined;
  const lead = evt?.leadId ? s.leads.find((l) => l.id === evt.leadId) : undefined;
  const listing = evt?.listingId ? getListing(evt.listingId) : undefined;

  return (
    <div>
      <PageHead title="Calendar" sub="Website requests land here as tentative until you confirm them. Same events as your Google Calendar." />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" onClick={() => step(-1)} aria-label="Previous"><ChevronLeft /></Button>
          <Button variant="outline" size="sm" onClick={() => setAnchor(today)}>Today</Button>
          <Button variant="outline" size="icon-sm" onClick={() => step(1)} aria-label="Next"><ChevronRight /></Button>
          <h2 className="ml-1 font-display text-[20px] font-medium" aria-live="polite">{title}</h2>
        </div>
        <div className="inline-flex rounded-md border bg-card p-0.5" role="tablist" aria-label="Calendar view">
          {(["month", "week", "day"] as View[]).map((v) => <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)} className={cn("rounded px-3 py-1.5 text-[13px] font-semibold capitalize", view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>{v}</button>)}
        </div>
      </div>
      <div className="mb-3 flex flex-wrap gap-3 text-[12px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded border border-dashed border-amber-500 bg-amber-50" /> Tentative request</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded border border-emerald/40 bg-emerald/10" /> Confirmed showing</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded border border-gold bg-gold/15" /> Open house</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded border border-sky-300 bg-sky-50" /> Appointment</span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={`${view}-${view === "month" ? `${ay}-${am}` : anchor}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
          {view === "month" ? (
            <div className="overflow-hidden rounded-lg border bg-card">
              <div className="grid grid-cols-7 border-b bg-muted/50 text-center text-[11.5px] font-bold uppercase tracking-[0.1em] text-muted-foreground">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="py-2">{d}</div>)}</div>
              <div className="grid grid-cols-7">
                {monthDays.map((d) => {
                  const inMonth = +d.slice(5, 7) === am;
                  const evs = byDay.get(d) ?? [];
                  return (
                    <div key={d} className={cn("min-h-[72px] border-b border-r p-1 sm:min-h-[108px] sm:p-1.5 [&:nth-child(7n)]:border-r-0", !inMonth && "bg-muted/30")}>
                      <button onClick={() => { setAnchor(d); setView("day"); }} className={cn("mb-1 grid size-6 place-items-center rounded-full text-[12px] font-semibold tabular", d === today ? "bg-primary text-primary-foreground" : inMonth ? "hover:bg-muted" : "text-muted-foreground/60")}>{+d.slice(8)}</button>
                      <div className="hidden gap-1 sm:grid">{evs.slice(0, 3).map((e) => <EventChip key={e.id} e={e} onOpen={open} />)}{evs.length > 3 && <button onClick={() => { setAnchor(d); setView("day"); }} className="text-left text-[11px] font-semibold text-muted-foreground">+{evs.length - 3} more</button>}</div>
                      <div className="flex flex-wrap gap-0.5 sm:hidden">{evs.map((e) => <button key={e.id} onClick={() => open(e.id)} aria-label={e.title} className={cn("size-2 rounded-full", e.status === "tentative" ? "bg-amber-500" : e.status === "cancelled" ? "bg-muted-foreground/40" : "bg-emerald")} />)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border bg-card">
              <div className={cn("grid", view === "week" ? "min-w-[760px] grid-cols-[56px_repeat(7,1fr)]" : "grid-cols-[56px_1fr]")}>
                <div className="border-b" />
                {weekDays.map((d) => <div key={d} className={cn("border-b border-l px-2 py-2 text-center", d === today && "bg-primary/5")}><p className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">{ymdLabel(d, { weekday: "short" })}</p><p className={cn("font-display text-[18px] font-medium", d === today && "text-gold")}>{+d.slice(8)}</p></div>)}
                <div className="relative">{HOURS.map((h) => <div key={h} style={{ height: HOUR_PX }} className="border-b pr-1.5 pt-0.5 text-right text-[11px] text-muted-foreground tabular">{((h + 11) % 12) + 1}{h < 12 ? "a" : "p"}</div>)}</div>
                {weekDays.map((d) => (
                  <div key={d} className="relative border-l">
                    {HOURS.map((h) => <div key={h} style={{ height: HOUR_PX }} className="border-b border-dashed border-border/70" />)}
                    {(byDay.get(d) ?? []).map((e) => {
                      const p = detroitParts(e.start);
                      const dur = Math.max(30, (new Date(e.end).getTime() - new Date(e.start).getTime()) / 60000);
                      const top = ((p.h - 8) * 60 + p.min) * (HOUR_PX / 60);
                      if (p.h < 8 || p.h > 20) return null;
                      return (
                        <button key={e.id} onClick={() => open(e.id)} data-event={e.id} className={cn("absolute inset-x-1 overflow-hidden rounded border px-2 py-1 text-left text-[12px] font-semibold shadow-sm transition hover:z-10 hover:shadow-soft", tone(e))} style={{ top, height: Math.max(26, dur * (HOUR_PX / 60) - 2) }}>
                          <span className="block tabular opacity-80">{formatTime(e.start)}</span><span className="block truncate">{e.title}</span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
              {view === "day" && (byDay.get(anchor) ?? []).length === 0 && <p className="border-t px-4 py-6 text-center text-[14px] text-muted-foreground">Nothing scheduled for this day.</p>}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <Dialog open={!!evt} onOpenChange={(o) => !o && open(null)} modal={!tour.active}>
        <DialogContent className="sm:max-w-lg" data-tour="event-detail" onInteractOutside={(e) => tour.active && e.preventDefault()}>
          {evt && (
            <>
              <DialogHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("rounded-full border px-2 py-0.5 text-[11.5px] font-bold", tone(evt))}>{evt.status === "tentative" ? "Tentative" : evt.status === "cancelled" ? "Cancelled" : "Confirmed"}</span>
                  <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-bold text-[#6b5126]">Demo</span>
                </div>
                <DialogTitle className="mt-2 font-display text-[22px] font-medium">{evt.title}</DialogTitle>
                <DialogDescription className="text-[14px]">{formatDateLong(evt.start)} · {formatTime(evt.start)} to {formatTime(evt.end)} {formatTz(evt.start)}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-2.5 text-[14px]">
                {listing && <Link href={`/homes/${listing.id}`} className="flex items-center gap-2.5 hover:underline"><MapPin className="size-4 text-gold" />{listing.address}, {listing.city} <ExternalLink className="size-3.5 text-muted-foreground" /></Link>}
                {lead && <Link href={`/dashboard/leads?lead=${lead.id}`} className="flex items-center gap-2.5 hover:underline"><UserRound className="size-4 text-gold" />{lead.firstName} {lead.lastName} · {lead.phone}</Link>}
                {sh && <p className="flex items-center gap-2.5"><CalendarClock className="size-4 text-gold" />Request {sh.ref} · <ShowingBadge status={sh.status} /></p>}
                {sh?.alternate && <p className="text-[13px] text-muted-foreground">Buyer&apos;s backup time: {formatDateLong(sh.alternate.start)}, {formatTime(sh.alternate.start)}</p>}
                {evt.status === "tentative" && <p className="rounded-md bg-amber-50 px-3 py-2 text-[13px] text-amber-950">This is a buyer request, not a confirmed appointment. Confirm it once you&apos;ve checked your schedule.</p>}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {evt.status !== "confirmed" && <Button onClick={() => { setEventStatus(evt.id, "confirmed"); toast.success("Confirmed (demo)"); }}><CheckCircle2 /> Confirm</Button>}
                {evt.status === "confirmed" && evt.kind === "showing" && <Button variant="outline" onClick={() => { setEventStatus(evt.id, "tentative"); toast("Marked tentative (demo)"); }}>Mark tentative</Button>}
                {evt.status !== "cancelled" && <Button variant="outline" onClick={() => setResched(true)}><CalendarClock /> Reschedule</Button>}
                {evt.status !== "cancelled" && <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setConfirmCancel(true)}><XCircle /> Cancel</Button>}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      {evt && <RescheduleDialog open={resched} onOpenChange={setResched} currentStart={evt.start} onConfirm={(slot) => { rescheduleEvent(evt.id, slot); toast.success("Rescheduled (demo)", { description: "The linked request was updated too." }); }} />}
      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Cancel this event?</AlertDialogTitle><AlertDialogDescription>It stays on the calendar as cancelled, and a linked showing request is marked cancelled too. Demo only.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Keep it</AlertDialogCancel><AlertDialogAction onClick={() => { if (evt) { setEventStatus(evt.id, "cancelled"); toast("Cancelled (demo)"); } }}>Cancel event</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
