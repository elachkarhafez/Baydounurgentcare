"use client";
import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { ArrowRight, CalendarClock, CalendarDays, CheckCircle2, Inbox, Sparkles, Users, Workflow, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDemoState } from "@/lib/use-demo";
import { getListing } from "@/data/listings";
import { STAGES } from "@/lib/labels";
import { formatDate, formatDateTime, formatTime, relativeTime } from "@/lib/time";
import { DashSkeleton, Panel, ShowingBadge, SystemIcon, PageHead } from "@/components/dashboard/bits";
import { useTour } from "@/components/tour/tour-provider";

export function Overview() {
  const s = useDemoState();
  const { start } = useTour();
  if (!s) return <DashSkeleton />;
  const now = Date.now();
  const newReq = s.showings.filter((x) => x.status === "requested");
  const upcoming = s.showings.filter((x) => new Date(x.preferred.start).getTime() > now && x.status !== "cancelled" && x.status !== "completed");
  const follow = s.leads.filter((l) => l.stage === "follow_up");
  const metrics = [
    { k: "Total leads", v: s.leads.length, icon: Users, href: "/dashboard/leads", note: `${s.leads.filter((l) => now - new Date(l.createdAt).getTime() < 7 * 864e5).length} this week` },
    { k: "New showing requests", v: newReq.length, icon: Inbox, href: "/dashboard/showings?status=requested", note: "Awaiting your confirmation" },
    { k: "Upcoming showings", v: upcoming.length, icon: CalendarClock, href: "/dashboard/calendar", note: "Requested and confirmed" },
    { k: "Need follow-up", v: follow.length, icon: BellRing, href: "/dashboard/leads?stage=follow_up", note: "Leads marked Follow-Up Needed" },
  ];
  const events = s.events.filter((e) => new Date(e.end).getTime() > now && e.status !== "cancelled").sort((a, b) => a.start.localeCompare(b.start)).slice(0, 5);
  const recent = [...s.showings].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  const max = Math.max(1, ...STAGES.map((st) => s.leads.filter((l) => l.stage === st.key).length));
  return (
    <div>
      <PageHead title="Welcome back, Mike." sub="Here's everything that came in from your website." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 md:gap-4" data-tour="metrics">
        {metrics.map((m, i) => (
          <motion.div key={m.k} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
            <Link href={m.href} className="group block h-full rounded-lg border bg-card p-4 transition hover:border-gold/60 hover:shadow-soft md:p-5">
              <div className="flex items-center justify-between"><span className="text-[12.5px] font-semibold text-muted-foreground">{m.k}</span><m.icon className="size-4 text-gold" /></div>
              <motion.p key={m.v} initial={{ opacity: 0.3, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-2 font-display text-[36px] font-medium leading-none tabular" data-testid={`metric-${i}`}>{m.v}</motion.p>
              <p className="mt-2 text-[12px] text-muted-foreground">{m.note}</p>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Panel title="Recent showing requests" action={<Link href="/dashboard/showings" className="text-[12.5px] font-semibold text-gold hover:underline">View all</Link>}>
          <ul className="divide-y">
            {recent.map((sh) => {
              const l = getListing(sh.listingId)!;
              const lead = s.leads.find((x) => x.id === sh.leadId);
              return (
                <li key={sh.id}>
                  <Link href={`/dashboard/showings?showing=${sh.id}`} className="flex items-center gap-3 px-4 py-3 transition hover:bg-muted/50">
                    <Image src={l.photos[0]} alt="" width={64} height={48} className="h-12 w-16 shrink-0 rounded object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold">{lead?.firstName} {lead?.lastName} <span className="font-normal text-muted-foreground">· {l.address}</span></p>
                      <p className="text-[12.5px] text-muted-foreground">{formatDateTime(sh.preferred.start)} · requested {relativeTime(sh.createdAt)}</p>
                    </div>
                    <ShowingBadge status={sh.status} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Panel>
        <Panel title="Upcoming appointments" action={<Link href="/dashboard/calendar" className="text-[12.5px] font-semibold text-gold hover:underline">Calendar</Link>}>
          <ul className="divide-y">
            {events.length === 0 && <li className="px-4 py-8 text-center text-[14px] text-muted-foreground">Nothing on the calendar yet.</li>}
            {events.map((e) => (
              <li key={e.id}>
                <Link href={`/dashboard/calendar?event=${e.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50">
                  <span className="grid w-12 shrink-0 text-center"><span className="text-[11px] font-bold uppercase text-gold">{formatDate(e.start).split(",")[0]}</span><span className="font-display text-[18px] font-medium leading-tight">{formatTime(e.start)}</span></span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-semibold">{e.title}</span><span className="text-[12.5px] text-muted-foreground">{formatDate(e.start)}</span></span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${e.status === "tentative" ? "border border-dashed border-amber-400 bg-amber-50 text-amber-900" : "bg-emerald/10 text-emerald"}`}>{e.status === "tentative" ? "Tentative" : "Confirmed"}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Panel title="Lead pipeline" action={<Link href="/dashboard/leads?view=pipeline" className="text-[12.5px] font-semibold text-gold hover:underline">Open pipeline</Link>}>
          <ul className="grid gap-3 p-4">
            {STAGES.map((st) => {
              const n = s.leads.filter((l) => l.stage === st.key).length;
              return (
                <li key={st.key}>
                  <Link href={`/dashboard/leads?stage=${st.key}`} className="group grid gap-1">
                    <span className="flex justify-between text-[13px]"><span className="font-semibold group-hover:underline">{st.label}</span><span className="tabular text-muted-foreground">{n}</span></span>
                    <span className="h-2 overflow-hidden rounded-full bg-muted"><motion.span className="block h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${(n / max) * 100}%` }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} /></span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Panel>
        <Panel title="Recent activity">
          <ul className="max-h-[340px] divide-y overflow-y-auto" data-testid="activity">
            {s.activities.slice(0, 12).map((a) => (
              <li key={a.id} className="flex gap-3 px-4 py-3">
                <SystemIcon system={a.system} />
                <div className="min-w-0"><p className="text-[13.5px] leading-snug">{a.message}</p><p className="mt-0.5 text-[12px] text-muted-foreground">{relativeTime(a.at)}</p></div>
              </li>
            ))}
          </ul>
        </Panel>
        <div className="grid min-w-0 content-start gap-6">
          <Panel title="Sent automatically" action={<Link href="/dashboard/automations" className="text-[12.5px] font-semibold text-gold hover:underline">View all</Link>}>
            <ul className="divide-y">
              {s.runs.slice(0, 4).map((r) => {
                const sh = s.showings.find((x) => x.id === r.showingId);
                return (
                  <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                    {r.done ? <CheckCircle2 className="size-5 shrink-0 text-emerald" /> : <Workflow className="size-5 shrink-0 animate-pulse text-gold" />}
                    <div className="min-w-0 flex-1"><p className="truncate text-[13.5px] font-semibold">{sh ? getListing(sh.listingId)?.address : "Request"}</p><p className="text-[12px] text-muted-foreground">Email, Follow Up Boss, calendar · {relativeTime(r.createdAt)}</p></div>
                  </li>
                );
              })}
            </ul>
          </Panel>
          <Panel title="Quick actions">
            <div className="grid gap-2 p-4">
              <Button asChild variant="outline" className="justify-between"><Link href="/dashboard/showings?status=requested">Review new requests <ArrowRight /></Link></Button>
              <Button asChild variant="outline" className="justify-between"><Link href="/dashboard/calendar">Open calendar <CalendarDays /></Link></Button>
              <Button className="justify-between" onClick={() => start()}>Run the guided demo <Sparkles /></Button>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
