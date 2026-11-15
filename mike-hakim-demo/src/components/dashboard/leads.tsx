"use client";
import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Columns3, Search, Table2, UserX, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useDemoState } from "@/lib/use-demo";
import { updateLeadStage } from "@/lib/store";
import { STAGES, STAGE_LABEL, FINANCING } from "@/lib/labels";
import { getListing } from "@/data/listings";
import { relativeTime } from "@/lib/time";
import { initials } from "@/lib/format";
import { DashSkeleton, PageHead, StageBadge } from "@/components/dashboard/bits";
import { LeadSheet } from "@/components/dashboard/lead-sheet";
import type { Lead, LeadStage } from "@/lib/types";
import { cn } from "cn";

export function LeadsPage() {
  const s = useDemoState();
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const [q, setQ] = useState("");
  const stage = (params.get("stage") ?? "all") as LeadStage | "all";
  const view = params.get("view") === "pipeline" ? "pipeline" : "table";
  const leadId = params.get("lead");
  const setParam = (k: string, v: string | null) => { const p = new URLSearchParams(params.toString()); if (v === null) p.delete(k); else p.set(k, v); router.replace(`${path}?${p}`, { scroll: false }); };
  const leads = useMemo(() => {
    if (!s) return [];
    const t = q.toLowerCase().trim();
    return [...s.leads].filter((l) => (stage === "all" || l.stage === stage) && (!t || `${l.firstName} ${l.lastName} ${l.email} ${l.phone} ${l.listingIds.map((id) => getListing(id)?.address).join(" ")}`.toLowerCase().includes(t))).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [s, q, stage]);
  if (!s) return <DashSkeleton />;
  return (
    <div>
      <PageHead title="Leads" sub="Every buyer who reached out through your website, already in Follow Up Boss.">
        <div className="inline-flex rounded-md border bg-card p-0.5">
          <button onClick={() => setParam("view", null)} className={cn("inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-[13px] font-semibold", view === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground")} aria-pressed={view === "table"}><Table2 className="size-4" /> List</button>
          <button onClick={() => setParam("view", "pipeline")} className={cn("inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-[13px] font-semibold", view === "pipeline" ? "bg-primary text-primary-foreground" : "text-muted-foreground")} aria-pressed={view === "pipeline"}><Columns3 className="size-4" /> Pipeline</button>
        </div>
      </PageHead>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <label className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, phone or property" aria-label="Search leads" className="h-10 w-full rounded-md border bg-card pl-9 pr-3 text-[14px] outline-none focus:border-primary" /></label>
        <Select value={stage} onValueChange={(v) => setParam("stage", v === "all" ? null : v)}>
          <SelectTrigger className="w-full bg-card sm:w-56" aria-label="Filter by stage"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All stages</SelectItem>{STAGES.map((st) => <SelectItem key={st.key} value={st.key}>{st.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {leads.length === 0 ? (
        <div className="grid place-items-center rounded-lg border border-dashed bg-card py-16 text-center"><UserX className="size-7 text-gold" /><p className="mt-3 font-semibold">No leads match</p><Button variant="link" onClick={() => { setQ(""); setParam("stage", null); }}>Clear filters</Button></div>
      ) : view === "table" ? (
        <div className="overflow-hidden rounded-lg border bg-card">
          <table className="hidden w-full text-[14px] md:table">
            <thead className="bg-muted/50 text-left text-[12px] uppercase tracking-[0.1em] text-muted-foreground">
              <tr><th className="px-4 py-3 font-semibold">Name</th><th className="px-4 py-3 font-semibold">Property</th><th className="px-4 py-3 font-semibold">Financing</th><th className="px-4 py-3 font-semibold">Stage</th><th className="px-4 py-3 font-semibold">Updated</th><th /></tr>
            </thead>
            <tbody className="divide-y">
              {leads.map((l) => (
                <tr key={l.id} className="cursor-pointer transition hover:bg-muted/40" onClick={() => setParam("lead", l.id)} data-lead={l.id}>
                  <td className="px-4 py-3"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-full bg-primary/10 text-[13px] font-bold text-primary">{initials(l.firstName, l.lastName)}</span><div><p className="font-semibold">{l.firstName} {l.lastName}</p><p className="text-[12.5px] text-muted-foreground">{l.email}</p></div></div></td>
                  <td className="max-w-[220px] truncate px-4 py-3">{getListing(l.listingIds[0])?.address}</td>
                  <td className="px-4 py-3">{FINANCING[l.financing]}</td>
                  <td className="px-4 py-3"><StageBadge stage={l.stage} /></td>
                  <td className="px-4 py-3 text-muted-foreground">{relativeTime(l.updatedAt)}</td>
                  <td className="px-2"><ChevronRight className="size-4 text-muted-foreground" /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="divide-y md:hidden">
            {leads.map((l) => (
              <li key={l.id}><button onClick={() => setParam("lead", l.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left" data-lead={l.id}>
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-[13px] font-bold text-primary">{initials(l.firstName, l.lastName)}</span>
                <span className="min-w-0 flex-1"><b className="block text-[14.5px]">{l.firstName} {l.lastName}</b><span className="block truncate text-[12.5px] text-muted-foreground">{getListing(l.listingIds[0])?.address} · {relativeTime(l.updatedAt)}</span></span>
                <StageBadge stage={l.stage} />
              </button></li>
            ))}
          </ul>
        </div>
      ) : (
        <Pipeline leads={leads} open={(id) => setParam("lead", id)} />
      )}
      <LeadSheet leadId={leadId} onClose={() => setParam("lead", null)} />
    </div>
  );
}

function Pipeline({ leads, open }: { leads: Lead[]; open: (id: string) => void }) {
  const [over, setOver] = useState<LeadStage | null>(null);
  const move = (id: string, st: LeadStage) => { updateLeadStage(id, st); toast(`Moved to ${STAGE_LABEL[st]}`, { description: "Logged to the simulated CRM." }); };
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-4 md:mx-0 md:px-0">
      <div className="grid min-w-[1100px] grid-cols-6 gap-3">
        {STAGES.map((st) => {
          const col = leads.filter((l) => l.stage === st.key);
          return (
            <div key={st.key} onDragOver={(e) => { e.preventDefault(); setOver(st.key); }} onDragLeave={() => setOver(null)} onDrop={(e) => { e.preventDefault(); setOver(null); const id = e.dataTransfer.getData("text/lead"); if (id) move(id, st.key); }}
              className={cn("flex min-h-[420px] flex-col rounded-lg border bg-muted/40 p-2 transition-colors", over === st.key && "border-gold bg-gold/10")} data-stage={st.key}>
              <div className="flex items-center justify-between px-1.5 py-1.5"><span className="text-[12.5px] font-bold">{st.label}</span><span className="rounded-full bg-card px-2 text-[12px] font-semibold tabular hairline">{col.length}</span></div>
              <div className="grid gap-2">
                <AnimatePresence>
                  {col.map((l) => (
                    <motion.div key={l.id} layout layoutId={`lead-${l.id}`} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ type: "spring", stiffness: 400, damping: 34 }}
                      draggable onDragStart={(e) => (e as unknown as React.DragEvent).dataTransfer?.setData("text/lead", l.id)}
                      className="cursor-grab rounded-md border bg-card p-3 shadow-sm active:cursor-grabbing">
                      <button className="block w-full text-left" onClick={() => open(l.id)}>
                        <p className="text-[13.5px] font-semibold">{l.firstName} {l.lastName}</p>
                        <p className="truncate text-[12px] text-muted-foreground">{getListing(l.listingIds[0])?.address}</p>
                        <p className="mt-1 text-[11.5px] text-muted-foreground">{FINANCING[l.financing]} · {relativeTime(l.updatedAt)}</p>
                      </button>
                      <Select value={l.stage} onValueChange={(v) => move(l.id, v as LeadStage)}>
                        <SelectTrigger size="sm" className="mt-2 h-8 w-full text-[12px]" aria-label={`Move ${l.firstName} ${l.lastName}`}><SelectValue /></SelectTrigger>
                        <SelectContent>{STAGES.map((x) => <SelectItem key={x.key} value={x.key}>{x.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[12px] text-muted-foreground">Drag cards between columns on desktop, or use the menu on each card.</p>
    </div>
  );
}
