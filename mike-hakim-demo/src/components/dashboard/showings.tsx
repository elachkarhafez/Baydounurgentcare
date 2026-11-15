"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { CalendarClock, CheckCircle2, ExternalLink, FileText, Mail, UserRound, XCircle, CalendarX, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useDemoState } from "@/lib/use-demo";
import { setShowingStatus } from "@/lib/store";
import { getListing } from "@/data/listings";
import { formatDateLong, formatTime, formatTz, relativeTime } from "@/lib/time";
import { FINANCING, SHOWING_STATUS } from "@/lib/labels";
import { bytes } from "@/lib/format";
import { DashSkeleton, PageHead, ShowingBadge } from "@/components/dashboard/bits";
import { RescheduleDialog } from "@/components/dashboard/reschedule-dialog";
import type { ShowingStatus } from "@/lib/types";
import { cn } from "cn";

const FILTERS: (ShowingStatus | "all")[] = ["all", "requested", "confirmed", "rescheduled", "completed", "cancelled"];

export function ShowingsPage() {
  const s = useDemoState();
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const status = (params.get("status") ?? "all") as ShowingStatus | "all";
  const focus = params.get("showing");
  const [resched, setResched] = useState<string | null>(null);
  const [cancel, setCancel] = useState<string | null>(null);
  const list = useMemo(() => (s ? [...s.showings].filter((x) => status === "all" || x.status === status).sort((a, b) => { const ca = a.status === "cancelled" || a.status === "completed" ? 1 : 0, cb = b.status === "cancelled" || b.status === "completed" ? 1 : 0; return ca - cb || (ca ? b.preferred.start.localeCompare(a.preferred.start) : a.preferred.start.localeCompare(b.preferred.start)); }) : []), [s, status]);
  useEffect(() => { if (focus && s) setTimeout(() => document.getElementById(`sh-${focus}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 200); }, [focus, s]);
  if (!s) return <DashSkeleton />;
  const setStatus = (v: string) => { const p = new URLSearchParams(params.toString()); if (v === "all") p.delete("status"); else p.set("status", v); p.delete("showing"); router.replace(`${path}?${p}`, { scroll: false }); };
  const act = (id: string, st: ShowingStatus, msg: string) => { setShowingStatus(id, st); toast.success(msg, { description: "Demo only. Calendar and lead stage updated." }); };
  const rs = s.showings.find((x) => x.id === resched);
  return (
    <div>
      <PageHead title="Showing requests" sub="Every request starts as tentative. Confirm, reschedule or cancel, and the calendar and lead update with it." />
      <div className="mb-4 flex gap-1.5 overflow-x-auto no-scrollbar" role="tablist" aria-label="Filter by status">
        {FILTERS.map((f) => {
          const n = f === "all" ? s.showings.length : s.showings.filter((x) => x.status === f).length;
          return <button key={f} role="tab" aria-selected={status === f} onClick={() => setStatus(f)} className={cn("shrink-0 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition", status === f ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted")}>{f === "all" ? "All" : SHOWING_STATUS[f].replace(" (tentative)", "")} <span className="tabular opacity-70">{n}</span></button>;
        })}
      </div>
      {list.length === 0 && <div className="grid place-items-center rounded-lg border border-dashed bg-card py-16 text-center"><CalendarX className="size-7 text-gold" /><p className="mt-3 font-semibold">No showings with this status</p></div>}
      <ul className="grid gap-3">
        {list.map((sh) => {
          const l = getListing(sh.listingId)!;
          const lead = s.leads.find((x) => x.id === sh.leadId);
          const email = s.emails.find((e) => e.showingId === sh.id);
          const evt = s.events.find((e) => e.showingId === sh.id);
          const closed = sh.status === "cancelled" || sh.status === "completed";
          return (
            <motion.li layout key={sh.id} id={`sh-${sh.id}`} className={cn("overflow-hidden rounded-lg border bg-card transition-shadow", focus === sh.id && "ring-2 ring-gold")} data-showing={sh.id}>
              <div className="grid gap-4 p-4 md:grid-cols-[140px_1fr_auto] md:items-start">
                <Image src={l.photos[0]} alt="" width={280} height={190} className="hidden h-24 w-36 rounded-md object-cover md:block" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><ShowingBadge status={sh.status} /><span className="font-mono text-[12px] text-muted-foreground">{sh.ref}</span><span className="text-[12px] text-muted-foreground">· received {relativeTime(sh.createdAt)}</span></div>
                  <Link href={`/homes/${l.id}`} className="mt-1.5 inline-flex items-center gap-1 text-[16px] font-semibold hover:underline">{l.address}, {l.city} <ExternalLink className="size-3.5 text-muted-foreground" /></Link>
                  <p className="mt-1 flex items-center gap-1.5 text-[14px]"><CalendarClock className="size-4 text-gold" /><b>{formatDateLong(sh.preferred.start)}</b> at {formatTime(sh.preferred.start)} {formatTz(sh.preferred.start)}</p>
                  {sh.alternate && <p className="ml-5.5 text-[13px] text-muted-foreground">Backup: {formatDateLong(sh.alternate.start)}, {formatTime(sh.alternate.start)}</p>}
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
                    <Link href={`/dashboard/leads?lead=${sh.leadId}`} className="inline-flex items-center gap-1.5 hover:text-foreground hover:underline"><UserRound className="size-3.5" />{lead?.firstName} {lead?.lastName} · {lead && FINANCING[lead.financing]}</Link>
                    <span className="inline-flex items-center gap-1.5"><FileText className="size-3.5" />{sh.document ? `${sh.document.name} (${bytes(sh.document.size)})` : "No pre-approval"}</span>
                  </div>
                  {sh.notes && <p className="mt-2 text-[13.5px]">“{sh.notes}”</p>}
                </div>
                <div className="flex flex-wrap gap-2 md:w-44 md:flex-col">
                  {!closed && sh.status !== "confirmed" && <Button size="sm" onClick={() => act(sh.id, "confirmed", "Showing confirmed")}><CheckCircle2 /> Confirm</Button>}
                  {!closed && <Button size="sm" variant="outline" onClick={() => setResched(sh.id)}><CalendarClock /> Reschedule</Button>}
                  {sh.status === "confirmed" && <Button size="sm" variant="outline" onClick={() => act(sh.id, "completed", "Marked as completed")}><ClipboardCheck /> Completed</Button>}
                  {!closed && <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setCancel(sh.id)}><XCircle /> Cancel</Button>}
                  {closed && <Button size="sm" variant="outline" onClick={() => act(sh.id, "requested", "Reopened as tentative")}>Reopen</Button>}
                  <div className="flex gap-2 md:flex-col">
                    {email && <Button asChild size="sm" variant="ghost"><Link href={`/dashboard/automations?email=${email.id}`}><Mail /> Email</Link></Button>}
                    {evt && <Button asChild size="sm" variant="ghost"><Link href={`/dashboard/calendar?event=${evt.id}`}><CalendarClock /> Calendar</Link></Button>}
                  </div>
                </div>
              </div>
            </motion.li>
          );
        })}
      </ul>
      {rs && <RescheduleDialog open={!!resched} onOpenChange={(o) => !o && setResched(null)} currentStart={rs.preferred.start} onConfirm={(slot) => { setShowingStatus(rs.id, "rescheduled", slot); toast.success("Showing rescheduled", { description: "Demo only. The buyer isn't notified." }); }} />}
      <AlertDialog open={!!cancel} onOpenChange={(o) => !o && setCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Cancel this showing?</AlertDialogTitle><AlertDialogDescription>The request and its calendar event will be marked cancelled in this demo. You can reopen it later.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Keep it</AlertDialogCancel><AlertDialogAction onClick={() => { if (cancel) act(cancel, "cancelled", "Showing cancelled"); setCancel(null); }}>Cancel showing</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
