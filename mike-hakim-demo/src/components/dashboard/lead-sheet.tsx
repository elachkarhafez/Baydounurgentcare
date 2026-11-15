"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { FileText, Mail, Phone, Send, Users } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useDemoState } from "@/lib/use-demo";
import { addLeadNote, updateLeadStage } from "@/lib/store";
import { STAGES, BUYER_STATUS, FINANCING } from "@/lib/labels";
import { getListing } from "@/data/listings";
import { formatDateTime, relativeTime } from "@/lib/time";
import { usd, bytes, initials } from "@/lib/format";
import { ShowingBadge, SimBadge, StageBadge, SystemIcon } from "@/components/dashboard/bits";
import type { LeadStage } from "@/lib/types";
import { useTour } from "@/components/tour/tour-provider";

export function LeadSheet({ leadId, onClose }: { leadId: string | null; onClose: () => void }) {
  const s = useDemoState();
  const [note, setNote] = useState("");
  const tour = useTour();
  const lead = s?.leads.find((l) => l.id === leadId);
  const showings = s?.showings.filter((x) => x.leadId === leadId) ?? [];
  const acts = s?.activities.filter((a) => a.leadId === leadId) ?? [];
  const logs = s?.crmLogs.filter((c) => c.leadId === leadId) ?? [];
  const email = s?.emails.find((e) => showings.some((sh) => sh.id === e.showingId));
  return (
    <Sheet open={!!lead} onOpenChange={(o) => !o && onClose()} modal={!tour.active}>
      <SheetContent side="right" onInteractOutside={(e) => tour.active && e.preventDefault()} className="w-full gap-0 overflow-y-auto p-0 sm:max-w-xl" data-tour="lead-detail">
        {lead && (
          <>
            <SheetHeader className="border-b p-5">
              <div className="flex items-center gap-3">
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary font-display text-[18px] text-primary-foreground">{initials(lead.firstName, lead.lastName)}</span>
                <div className="min-w-0">
                  <SheetTitle className="font-display text-[22px] font-medium">{lead.firstName} {lead.lastName}</SheetTitle>
                  <SheetDescription className="text-[13px]">Source: {lead.source} · Added {relativeTime(lead.createdAt)} {lead.sample ? "· Sample lead" : ""}</SheetDescription>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2"><StageBadge stage={lead.stage} /><SimBadge label="In Follow Up Boss (demo)" /></div>
            </SheetHeader>
            <div className="grid gap-6 p-5">
              <section className="grid gap-2 text-[14px]">
                <a href={`mailto:${lead.email}`} className="flex items-center gap-2.5 hover:underline"><Mail className="size-4 text-gold" />{lead.email}</a>
                <a href={`tel:${lead.phone.replace(/\D/g, "")}`} className="flex items-center gap-2.5 hover:underline"><Phone className="size-4 text-gold" />{lead.phone}</a>
                <p className="flex items-center gap-2.5"><Users className="size-4 text-gold" />{BUYER_STATUS[lead.buyerStatus]} · {FINANCING[lead.financing]}</p>
              </section>

              <section>
                <label className="text-[12px] font-bold uppercase tracking-[0.14em] text-muted-foreground" htmlFor="stage">Lead stage</label>
                <Select value={lead.stage} onValueChange={(v) => { updateLeadStage(lead.id, v as LeadStage); toast.success("Stage updated", { description: "Synced to the simulated CRM log." }); }}>
                  <SelectTrigger id="stage" className="mt-2 w-full" data-testid="stage-select"><SelectValue /></SelectTrigger>
                  <SelectContent>{STAGES.map((st) => <SelectItem key={st.key} value={st.key}>{st.label}</SelectItem>)}</SelectContent>
                </Select>
              </section>

              <section>
                <h3 className="text-[12px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Properties of interest</h3>
                <ul className="mt-2 grid gap-2">
                  {lead.listingIds.map((id) => { const l = getListing(id); return l ? (
                    <li key={id}><Link href={`/homes/${id}`} className="flex items-center gap-3 rounded-md border p-2 hover:bg-muted/50"><Image src={l.photos[0]} alt="" width={64} height={48} className="h-12 w-16 rounded object-cover" /><span className="min-w-0"><b className="block truncate text-[14px]">{l.address}</b><span className="text-[12.5px] text-muted-foreground">{l.city} · {usd(l.price)}</span></span></Link></li>) : null; })}
                </ul>
              </section>

              {showings.length > 0 && (
                <section>
                  <h3 className="text-[12px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Showing requests</h3>
                  <ul className="mt-2 grid gap-2">
                    {showings.map((sh) => (
                      <li key={sh.id} className="rounded-md border p-3 text-[13.5px]">
                        <div className="flex items-center justify-between gap-2"><Link href={`/dashboard/showings?showing=${sh.id}`} className="font-semibold hover:underline">{getListing(sh.listingId)?.address}</Link><ShowingBadge status={sh.status} /></div>
                        <p className="mt-1 text-muted-foreground">{formatDateTime(sh.preferred.start)}{sh.alternate ? ` · backup ${formatDateTime(sh.alternate.start)}` : ""}</p>
                        <p className="mt-1 flex items-center gap-1.5 text-muted-foreground"><FileText className="size-3.5" />{sh.document ? `${sh.document.name} · ${sh.document.type} · ${bytes(sh.document.size)} (metadata only)` : "No pre-approval attached"}</p>
                        {sh.notes && <p className="mt-1">“{sh.notes}”</p>}
                      </li>
                    ))}
                  </ul>
                  {email && <Button asChild variant="outline" size="sm" className="mt-2"><Link href={`/dashboard/automations?email=${email.id}`}><Mail /> View the email</Link></Button>}
                </section>
              )}

              <section>
                <h3 className="text-[12px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Notes</h3>
                <form className="mt-2 grid gap-2" onSubmit={(e) => { e.preventDefault(); if (!note.trim()) return; addLeadNote(lead.id, note); setNote(""); toast.success("Note added"); }}>
                  <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Add a note, e.g. Called, prefers weekend showings" aria-label="New note" />
                  <Button type="submit" size="sm" className="justify-self-end" disabled={!note.trim()}><Send /> Add note</Button>
                </form>
                <ul className="mt-3 grid gap-2">
                  {lead.notes.map((n) => <li key={n.id} className="rounded-md bg-muted/60 px-3 py-2 text-[13.5px]"><p>{n.text}</p><p className="mt-1 text-[11.5px] text-muted-foreground">{formatDateTime(n.at)}</p></li>)}
                  {lead.notes.length === 0 && <li className="text-[13px] text-muted-foreground">No notes yet.</li>}
                </ul>
              </section>

              <section>
                <h3 className="text-[12px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Activity history</h3>
                <ul className="mt-2 grid gap-3">
                  {acts.slice(0, 15).map((a) => <li key={a.id} className="flex gap-3"><SystemIcon system={a.system} /><div><p className="text-[13.5px]">{a.message}</p><p className="text-[11.5px] text-muted-foreground">{formatDateTime(a.at)}</p></div></li>)}
                </ul>
              </section>

              <section>
                <h3 className="text-[12px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Follow Up Boss history</h3>
                <ul className="mt-2 grid gap-1.5 text-[12.5px]">
                  {logs.slice(0, 8).map((c) => <li key={c.id} className="flex justify-between gap-3 rounded border px-3 py-2"><span>{c.summary}</span><span className="shrink-0 text-muted-foreground">{relativeTime(c.at)}</span></li>)}
                </ul>
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
