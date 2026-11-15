"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, ChevronDown, Mail, Users, CalendarClock, Workflow, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDemoState } from "@/lib/use-demo";
import { getListing } from "@/data/listings";
import { formatDateTime, formatTime, relativeTime } from "@/lib/time";
import { DashSkeleton, PageHead, Panel, SimBadge } from "@/components/dashboard/bits";
import { EmailPreview } from "@/components/automation/email-preview";
import { cn } from "cn";

export function AutomationsPage() {
  const s = useDemoState();
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const emailId = params.get("email");
  const [openRun, setOpenRun] = useState<string | null>(null);
  useEffect(() => { if (s?.runs[0] && !openRun) setOpenRun(s.runs[0].id); }, [s?.runs, openRun]);
  if (!s) return <DashSkeleton />;
  const email = s.emails.find((e) => e.id === emailId);
  const setEmail = (id: string | null) => { const p = new URLSearchParams(params.toString()); if (id) p.set("email", id); else p.delete("email"); router.replace(`${path}?${p}`, { scroll: false }); };
  const calActs = s.activities.filter((a) => a.system === "calendar");
  return (
    <div>
      <PageHead title="Emails & sync" sub="Everything your website sent for you. Each request goes to your email, Follow Up Boss and your calendar." />
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {[{ i: Mail, t: "Emails to you", n: s.emails.length, d: "one for every request" }, { i: Users, t: "Follow Up Boss updates", n: s.crmLogs.length, d: "new leads, stages and notes" }, { i: CalendarClock, t: "Calendar holds", n: s.events.filter((e) => e.kind === "showing").length, d: "showings on your calendar" }].map((c) => (
          <div key={c.t} className="rounded-lg border bg-card p-4"><div className="flex items-center justify-between"><c.i className="size-5 text-gold" /><SimBadge label="Demo" /></div><p className="mt-3 font-display text-[28px] font-medium leading-none tabular">{c.n}</p><p className="mt-1 text-[13px] font-semibold">{c.t}</p><p className="text-[12px] text-muted-foreground">{c.d}</p></div>
        ))}
      </div>
      <Tabs defaultValue={emailId ? "email" : "runs"}>
        <TabsList className="mb-4 max-w-full justify-start overflow-x-auto no-scrollbar"><TabsTrigger value="runs">Requests</TabsTrigger><TabsTrigger value="email">Emails</TabsTrigger><TabsTrigger value="crm">Follow Up Boss</TabsTrigger><TabsTrigger value="calendar">Calendar</TabsTrigger></TabsList>
        <TabsContent value="runs">
          <Panel>
            <ul className="divide-y">
              {s.runs.map((r) => {
                const sh = s.showings.find((x) => x.id === r.showingId);
                const l = sh && getListing(sh.listingId);
                const lead = sh && s.leads.find((x) => x.id === sh.leadId);
                const isOpen = openRun === r.id;
                return (
                  <li key={r.id}>
                    <button onClick={() => setOpenRun(isOpen ? null : r.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/40" aria-expanded={isOpen}>
                      {r.done ? <CheckCircle2 className="size-5 text-emerald" /> : <Loader2 className="size-5 animate-spin text-gold" />}
                      <span className="min-w-0 flex-1"><b className="block truncate text-[14px]">{lead?.firstName} {lead?.lastName} · {l?.address}</b><span className="text-[12px] text-muted-foreground">{sh?.ref} · {relativeTime(r.createdAt)} · {r.steps.filter((x) => x.status === "done").length}/{r.steps.length} steps</span></span>
                      <ChevronDown className={cn("size-4 text-muted-foreground transition", isOpen && "rotate-180")} />
                    </button>
                    {isOpen && (
                      <ol className="grid gap-2 border-t bg-muted/20 px-4 py-3 sm:pl-12">
                        {r.steps.map((st) => (
                          <li key={st.key} className="flex items-start gap-2.5 text-[13.5px]">
                            {st.status === "done" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald" /> : st.status === "running" ? <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-gold" /> : <Workflow className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
                            <span><b>{st.label}</b>{st.detail && <span className="text-muted-foreground"> · {st.detail}</span>}{st.at && <span className="text-muted-foreground"> · {formatTime(st.at)}</span>}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </li>
                );
              })}
            </ul>
          </Panel>
        </TabsContent>
        <TabsContent value="email">
          <Panel>
            <ul className="divide-y">
              {s.emails.map((e) => (
                <li key={e.id}><button onClick={() => setEmail(e.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/40" data-email={e.id}>
                  <Mail className="size-5 shrink-0 text-gold" />
                  <span className="min-w-0 flex-1"><b className="block truncate text-[14px]">{e.subject}</b><span className="text-[12px] text-muted-foreground">To {e.to} · {formatDateTime(e.createdAt)}</span></span>
                  <SimBadge label="Demo" />
                </button></li>
              ))}
            </ul>
          </Panel>
        </TabsContent>
        <TabsContent value="crm">
          <Panel>
            <ul className="divide-y">
              {s.crmLogs.slice(0, 60).map((c) => {
                const lead = s.leads.find((l) => l.id === c.leadId);
                return (
                  <li key={c.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-[14px] font-semibold">{c.summary}</span><span className="text-[12px] text-muted-foreground">{formatDateTime(c.at)}</span></div>
                    <p className="mt-0.5 text-[12px] text-muted-foreground">{lead ? `${lead.firstName} ${lead.lastName}` : "Sample"} · added to Follow Up Boss automatically</p>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </TabsContent>
        <TabsContent value="calendar">
          <Panel>
            <ul className="divide-y">
              {calActs.length === 0 && <li className="px-4 py-6 text-center text-[14px] text-muted-foreground">No calendar activity yet.</li>}
              {calActs.map((a) => <li key={a.id} className="flex justify-between gap-3 px-4 py-3 text-[13.5px]"><span>{a.message}</span><span className="shrink-0 text-[12px] text-muted-foreground">{relativeTime(a.at)}</span></li>)}
            </ul>
          </Panel>
        </TabsContent>
      </Tabs>
      <Dialog open={!!email} onOpenChange={(o) => !o && setEmail(null)}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto p-0 sm:max-w-2xl">
          <DialogTitle className="sr-only">Simulated email preview</DialogTitle>
          {email && <EmailPreview email={email} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
