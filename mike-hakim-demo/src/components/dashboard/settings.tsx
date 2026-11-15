"use client";
import { useState } from "react";
import Link from "next/link";
import { CalendarClock, Database, KeyRound, Loader2, Mail, RotateCcw, ShieldCheck, Users, Play } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useDemoState } from "@/lib/use-demo";
import { resetDemo, simulateIntegration } from "@/lib/store";
import { DEMO_MODE, STORAGE_VERSION } from "@/config/demo";
import { safeStorage } from "@/lib/storage";
import { PageHead, SimBadge } from "@/components/dashboard/bits";
import { EmailPreview } from "@/components/automation/email-preview";

const CARDS = [
  { key: "crm" as const, icon: Users, name: "Follow Up Boss", purpose: "Create a lead for every website showing request, log the inquiry with the property and requested times, and keep stage changes and notes in sync.", fields: ["First and last name", "Email and phone", "Property address, price, listing ID", "Requested showing time", "Financing status", "Pre-approval file name (never the file)", "Source: Website, Stage: Showing Requested"], requirements: ["Mike's Follow Up Boss API access (Admin, then API) or an approved integration", "Confirmation of which API operations his plan supports for people, events, notes and appointments", "Server-side calls only, with the key stored as a secret, never in the browser", "A field mapping review with Mike before launch"] },
  { key: "calendar" as const, icon: CalendarClock, name: "Google Calendar", purpose: "Put each request on Mike's calendar as a tentative hold at the buyer's first choice, with the backup time and buyer details in the notes.", fields: ["Title: Showing Requested, plus the address", "Start and end time (America/Detroit)", "Status: tentative until confirmed", "Buyer name and phone in the description"], requirements: ["A one-time Google sign-in from Mike (OAuth consent) granting calendar access", "Choice of which calendar receives showings", "Token storage on the server and a way to revoke it", "Or a simpler path: an .ics invite attached to the notification email"] },
  { key: "email" as const, icon: Mail, name: "Email Notifications", purpose: "Send Mike an email the moment a buyer submits, with every detail and a link to open the request.", fields: ["Subject: New Showing Request, plus the address", "Buyer, contact, date, time, financing", "Pre-approval status", "Notes and a View Request link"], requirements: ["An email delivery service (for example Resend or Postmark) or a connected mailbox", "A verified sending domain for good deliverability", "Mike's business email address as the recipient", "Pre-approval letters shared as expiring private links, not attachments"] },
];

export function SettingsPage() {
  const s = useDemoState();
  const [busy, setBusy] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [info, setInfo] = useState<(typeof CARDS)[number] | null>(null);
  const run = async (k: "email" | "crm" | "calendar") => {
    setBusy(k);
    const id = await simulateIntegration(k);
    setBusy(null);
    if (k === "email" && id) setPreview(id);
    toast.success(k === "email" ? "Test email generated (not sent)" : k === "crm" ? "Test CRM sync logged (simulated)" : "Test calendar hold prepared (simulated)", { description: "See Automations for the full log." });
  };
  const email = s?.emails.find((e) => e.id === preview);
  return (
    <div>
      <PageHead title="Integrations" sub="How the website would connect to Mike's tools. Everything here runs in Demo Mode; no live connections are made." />
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-gold/40 bg-gold/10 p-4 text-[13.5px] text-[#5c4520]">
        <ShieldCheck className="size-5 shrink-0" />
        <p className="flex-1"><b>DEMO_MODE is {DEMO_MODE ? "on" : "off"}.</b> The integration registry only returns simulated adapters. Live adapters exist as inert placeholders and can&apos;t run until they&apos;re built server-side with approved credentials.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {CARDS.map((c) => (
          <article key={c.key} className="flex flex-col rounded-lg border bg-card p-5" data-integration={c.key}>
            <div className="flex items-center justify-between"><span className="grid size-10 place-items-center rounded-md bg-primary text-primary-foreground"><c.icon className="size-5" /></span><SimBadge label="Demo Simulation Active" /></div>
            <h2 className="mt-4 text-[20px] font-medium">{c.name}</h2>
            <p className="mt-1.5 text-[13.5px] text-muted-foreground">{c.purpose}</p>
            <h3 className="mt-4 text-[11.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Sample data fields</h3>
            <ul className="mt-2 grid gap-1 text-[13px]">{c.fields.map((f) => <li key={f} className="flex gap-2"><span className="mt-1.5 size-1.5 shrink-0 rotate-45 bg-gold" />{f}</li>)}</ul>
            <div className="mt-auto grid gap-2 pt-5">
              <Button onClick={() => run(c.key)} disabled={!!busy}>{busy === c.key ? <Loader2 className="animate-spin" /> : <Play />} Simulate Integration</Button>
              <Button variant="outline" onClick={() => setInfo(c)}><KeyRound /> Production requirements</Button>
              <Button asChild variant="ghost"><Link href={c.key === "email" ? "/dashboard/automations?email=" + (s?.emails[0]?.id ?? "") : c.key === "crm" ? "/dashboard/leads" : "/dashboard/calendar"}>Integration preview</Link></Button>
            </div>
          </article>
        ))}
      </div>

      <section className="mt-8 rounded-lg border bg-card p-5 md:p-6">
        <h2 className="text-[22px] font-medium">Production setup</h2>
        <p className="mt-1 text-[14px] text-muted-foreground">No live integration is attempted until approved credentials and permissions are supplied.</p>
        <dl className="mt-5 grid gap-4 md:grid-cols-2">
          {[
            ["MLS / IDX", "Requires valid authorized MLS/IDX access and an approved integration method, which may involve eXp, BoldTrail, or an authorized IDX vendor. The sample listings module is shaped so a feed adapter can replace it."],
            ["Follow Up Boss", "Requires the appropriate integration access and supported API operations, verified against Follow Up Boss's current documentation and Mike's account."],
            ["Google Calendar", "Requires authorized Google account access and appropriate permissions, granted by Mike through Google's consent screen."],
            ["Email", "Requires an authorized email delivery service or connected mailbox, ideally sending from a verified domain."],
          ].map(([k, v]) => <div key={k} className="rounded-md border p-4"><dt className="font-semibold">{k}</dt><dd className="mt-1 text-[13.5px] text-muted-foreground">{v}</dd></div>)}
        </dl>
      </section>

      <section className="mt-8 grid gap-4 rounded-lg border bg-card p-5 md:grid-cols-[1fr_auto] md:items-center md:p-6">
        <div className="flex gap-3">
          <Database className="mt-0.5 size-5 shrink-0 text-gold" />
          <div>
            <h2 className="text-[20px] font-medium">Demo data</h2>
            <p className="mt-1 text-[13.5px] text-muted-foreground">Stored in this browser only ({safeStorage.persistent() ? "localStorage" : "memory, storage is blocked"}, schema v{STORAGE_VERSION}). {s ? `${s.leads.length} leads, ${s.showings.length} showing requests, ${s.events.length} calendar events.` : ""} Uploaded files are never stored, only their names and sizes.</p>
          </div>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild><Button variant="outline" data-testid="reset-demo"><RotateCcw /> Reset Demo</Button></AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Reset the demo?</AlertDialogTitle><AlertDialogDescription>This removes every request you added and restores the original sample leads, showings and calendar. It only affects this browser.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Keep my changes</AlertDialogCancel><AlertDialogAction onClick={() => { resetDemo(); toast.success("Demo reset to the original sample data"); }}>Reset Demo</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>

      <Dialog open={!!email} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto p-0 sm:max-w-2xl"><DialogTitle className="sr-only">Test email preview</DialogTitle>{email && <EmailPreview email={email} />}</DialogContent>
      </Dialog>
      <Dialog open={!!info} onOpenChange={(o) => !o && setInfo(null)}>
        <DialogContent className="sm:max-w-lg">
          {info && <><DialogHeader><DialogTitle className="font-display text-[22px] font-medium">{info.name}: going live</DialogTitle><DialogDescription>What a real connection would need. Nothing here is connected today.</DialogDescription></DialogHeader>
            <ul className="grid gap-2 text-[14px]">{info.requirements.map((r) => <li key={r} className="flex gap-2.5"><KeyRound className="mt-0.5 size-4 shrink-0 text-gold" />{r}</li>)}</ul></>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
