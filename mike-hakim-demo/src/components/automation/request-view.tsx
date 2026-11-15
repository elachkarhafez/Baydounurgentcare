"use client";
import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { CalendarClock, LayoutDashboard, Mail, SearchX, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AutomationProgress } from "@/components/automation/automation-progress";
import { EmailPreview } from "@/components/automation/email-preview";
import { useDemoState } from "@/lib/use-demo";
import { getListing } from "@/data/listings";
import { formatDateLong, formatTime, formatTz } from "@/lib/time";
import { usd } from "@/lib/format";

export function RequestView({ refCode }: { refCode: string }) {
  const s = useDemoState();
  if (!s) return <div className="mx-auto grid max-w-5xl gap-4 px-4 py-12"><Skeleton className="h-10 w-1/2" /><Skeleton className="h-80" /></div>;
  const sh = s.showings.find((x) => x.ref === refCode);
  if (!sh) return (
    <div className="mx-auto grid max-w-md place-items-center px-4 py-24 text-center">
      <SearchX className="size-8 text-gold" />
      <h1 className="mt-4 text-[26px] font-medium">Request not found</h1>
      <p className="mt-2 text-[14px] text-muted-foreground">Demo requests live in this browser only. It may have been cleared by Reset Demo.</p>
      <Button asChild className="mt-6"><Link href="/homes">Browse homes</Link></Button>
    </div>
  );
  const l = getListing(sh.listingId)!;
  const lead = s.leads.find((x) => x.id === sh.leadId);
  const run = s.runs.find((r) => r.showingId === sh.id);
  const email = s.emails.find((e) => e.showingId === sh.id);
  const evt = s.events.find((e) => e.showingId === sh.id);
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
      <p className="eyebrow">Showing request · {sh.ref}</p>
      <h1 className="mt-2 text-[28px] font-medium leading-tight md:text-[38px]">Here&apos;s what happens after a buyer hits submit</h1>
      <p className="mt-2 max-w-2xl text-[15px] text-muted-foreground">In production each step would hand the request to a real service. In this demo every step is simulated, labeled as such, and stays inside this browser.</p>
      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid gap-6">
          {run && <AutomationProgress run={run} />}
          {run?.done && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid gap-3 sm:grid-cols-2">
              <Button asChild variant="outline" size="lg" className="justify-start"><Link href={`/dashboard/leads?lead=${sh.leadId}`}><Users /> Open the CRM lead</Link></Button>
              <Button asChild variant="outline" size="lg" className="justify-start"><Link href={evt ? `/dashboard/calendar?event=${evt.id}` : "/dashboard/calendar"}><CalendarClock /> See the calendar hold</Link></Button>
              <Button asChild variant="outline" size="lg" className="justify-start"><Link href={`/dashboard/automations?email=${email?.id ?? ""}`}><Mail /> Automation log</Link></Button>
              <Button asChild size="lg" className="justify-start"><Link href="/dashboard"><LayoutDashboard /> Open the Realtor Dashboard</Link></Button>
            </motion.div>
          )}
          {email ? (
            <div><h2 className="mb-3 text-[20px] font-medium">Email Mike would receive</h2><EmailPreview email={email} /></div>
          ) : (
            <div className="rounded-lg border border-dashed p-6 text-center text-[14px] text-muted-foreground">The email preview appears once that step finishes.</div>
          )}
        </div>
        <aside className="grid content-start gap-4">
          <div className="overflow-hidden rounded-lg border bg-card">
            <div className="relative aspect-[16/10]"><Image src={l.photos[0]} alt={l.headline} fill sizes="380px" className="object-cover" /></div>
            <div className="p-4">
              <p className="font-display text-[22px] font-medium tabular">{usd(l.price)}</p>
              <p className="text-[14px] font-semibold">{l.address}</p>
              <p className="text-[13px] text-muted-foreground">{l.city}, MI {l.zip}</p>
            </div>
          </div>
          <dl className="rounded-lg border bg-card p-4 text-[14px]">
            <div className="flex justify-between py-1.5"><dt className="text-muted-foreground">Buyer</dt><dd className="font-semibold">{lead?.firstName} {lead?.lastName}</dd></div>
            <div className="flex justify-between gap-3 py-1.5"><dt className="text-muted-foreground">Preferred</dt><dd className="text-right font-semibold">{formatDateLong(sh.preferred.start)}<br />{formatTime(sh.preferred.start)} {formatTz(sh.preferred.start)}</dd></div>
            {sh.alternate && <div className="flex justify-between gap-3 py-1.5"><dt className="text-muted-foreground">Backup</dt><dd className="text-right font-semibold">{formatDateLong(sh.alternate.start)}, {formatTime(sh.alternate.start)}</dd></div>}
            <div className="flex justify-between py-1.5"><dt className="text-muted-foreground">Status</dt><dd className="font-semibold">{sh.status === "requested" ? "Tentative, awaiting Mike" : sh.status}</dd></div>
            <div className="flex justify-between gap-3 py-1.5"><dt className="text-muted-foreground">Pre-approval</dt><dd className="truncate text-right font-semibold">{sh.document ? sh.document.name : "Skipped"}</dd></div>
          </dl>
          <Button asChild variant="ghost"><Link href="/homes">Browse more homes</Link></Button>
        </aside>
      </div>
    </div>
  );
}
