import { STORAGE_KEY, STORAGE_VERSION } from "@/config/demo";
import type { Activity, ActivitySystem, AutomationRun, BuyerStatus, CalendarEvent, DemoState, DocumentMeta, Financing, Lead, LeadStage, ShowingRequest, ShowingStatus, StepKey, TimeSlot } from "@/lib/types";
import { createSeed } from "@/data/seed";
import { safeStorage } from "@/lib/storage";
import { uid, refCode } from "@/lib/ids";
import { getListing } from "@/data/listings";
import { getAdapters } from "@/integrations";
import { STEP_LABELS, STEP_ORDER } from "@/lib/automation-steps";
import { STAGE_LABEL, SHOWING_STATUS } from "@/lib/labels";
import { formatDateTime } from "@/lib/time";

/* ------------------------------------------------------------------ */
/* Store core: one versioned JSON blob in localStorage.                */
/* ------------------------------------------------------------------ */

let state: DemoState | null = null;
const listeners = new Set<() => void>();

function load(): DemoState {
  const raw = safeStorage.get(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as DemoState;
      if (parsed && parsed.version === STORAGE_VERSION && Array.isArray(parsed.leads)) return parsed;
    } catch {
      /* corrupted: fall through to a fresh seed */
    }
  }
  const fresh = createSeed();
  safeStorage.set(STORAGE_KEY, JSON.stringify(fresh));
  return fresh;
}

export function getState(): DemoState {
  if (!state) state = load();
  return state;
}

function commit(next: DemoState) {
  state = next;
  safeStorage.set(STORAGE_KEY, JSON.stringify(next));
  listeners.forEach((l) => l());
}

function update(fn: (s: DemoState) => DemoState) {
  commit(fn(getState()));
}

export function subscribe(fn: () => void) {
  listeners.add(fn);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      state = null;
      fn();
    }
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(fn);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

const now = () => new Date().toISOString();
const act = (system: ActivitySystem, message: string, extra: Partial<Activity> = {}): Activity => ({ id: uid("act-"), at: now(), system, message, ...extra });
const withActivity = (s: DemoState, a: Activity): DemoState => ({ ...s, activities: [a, ...s.activities].slice(0, 300) });

/* ------------------------------------------------------------------ */
/* Buyer-side actions                                                  */
/* ------------------------------------------------------------------ */

export function toggleFavorite(id: string) {
  update((s) => ({ ...s, favorites: s.favorites.includes(id) ? s.favorites.filter((x) => x !== id) : [...s.favorites, id] }));
}
export function toggleCompare(id: string): boolean {
  const s = getState();
  if (s.compare.includes(id)) {
    commit({ ...s, compare: s.compare.filter((x) => x !== id) });
    return true;
  }
  if (s.compare.length >= 4) return false;
  commit({ ...s, compare: [...s.compare, id] });
  return true;
}
export function clearCompare() {
  update((s) => ({ ...s, compare: [] }));
}

export interface ShowingInput {
  listingId: string;
  preferred: TimeSlot;
  alternate?: TimeSlot;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  buyerStatus: BuyerStatus;
  financing: Financing;
  notes: string;
  document: DocumentMeta | null;
}

function findOrCreateLead(s: DemoState, i: Pick<ShowingInput, "firstName" | "lastName" | "email" | "phone" | "buyerStatus" | "financing">, listingId: string, stage: LeadStage): [DemoState, Lead] {
  const existing = s.leads.find((l) => l.email.toLowerCase() === i.email.toLowerCase());
  const t = now();
  if (existing) {
    const lead: Lead = { ...existing, firstName: i.firstName, lastName: i.lastName, phone: i.phone, buyerStatus: i.buyerStatus, financing: i.financing, stage, listingIds: Array.from(new Set([listingId, ...existing.listingIds])), updatedAt: t };
    return [{ ...s, leads: s.leads.map((l) => (l.id === lead.id ? lead : l)) }, lead];
  }
  const lead: Lead = { id: uid("lead-"), firstName: i.firstName, lastName: i.lastName, email: i.email, phone: i.phone, stage, source: "Website", buyerStatus: i.buyerStatus, financing: i.financing, listingIds: [listingId], notes: [], createdAt: t, updatedAt: t };
  return [{ ...s, leads: [lead, ...s.leads] }, lead];
}

/** Records the request (step 1) and starts the simulated automation. */
export function submitShowingRequest(input: ShowingInput): ShowingRequest {
  const [s0, lead] = findOrCreateLead(getState(), input, input.listingId, "showing_requested");
  let s = s0;
  const t = now();
  const showing: ShowingRequest = {
    id: uid("show-"), ref: refCode(), listingId: input.listingId, leadId: lead.id, preferred: input.preferred, alternate: input.alternate,
    status: "requested", notes: input.notes.trim(), document: input.document, createdAt: t, updatedAt: t,
  };
  const run: AutomationRun = { id: uid("run-"), showingId: showing.id, createdAt: t, done: false, steps: STEP_ORDER.map((key) => ({ key, label: STEP_LABELS[key], status: "pending" })) };
  const l = getListing(input.listingId)!;
  s = { ...s, showings: [showing, ...s.showings], runs: [run, ...s.runs] };
  s = withActivity(s, act("website", `${lead.firstName} ${lead.lastName} requested a showing at ${l.address}`, { leadId: lead.id, showingId: showing.id }));
  commit(s);
  runAutomation(run.id);
  return showing;
}

export function askQuestion(i: { listingId: string; name: string; email: string; phone: string; message: string }) {
  let s = getState();
  const [firstName, ...rest] = i.name.trim().split(/\s+/);
  let lead: Lead;
  [s, lead] = findOrCreateLead(s, { firstName, lastName: rest.join(" "), email: i.email, phone: i.phone, buyerStatus: "searching", financing: "not_yet" }, i.listingId, "new");
  const note = { id: uid("note-"), at: now(), text: `Question about ${getListing(i.listingId)?.address}: ${i.message}` };
  lead = { ...lead, notes: [note, ...lead.notes] };
  s = { ...s, leads: s.leads.map((l) => (l.id === lead.id ? lead : l)) };
  s = withActivity(s, act("website", `${lead.firstName} ${lead.lastName} asked a question about ${getListing(i.listingId)?.address}`, { leadId: lead.id }));
  commit(s);
  return lead;
}

/* ------------------------------------------------------------------ */
/* Automation orchestration (simulated adapters, staged with delays)   */
/* ------------------------------------------------------------------ */

const running = new Set<string>();
const STEP_DELAY = 1100;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function setStep(runId: string, key: StepKey, patch: Partial<AutomationRun["steps"][number]>) {
  update((s) => ({
    ...s,
    runs: s.runs.map((r) => (r.id !== runId ? r : { ...r, steps: r.steps.map((st) => (st.key === key ? { ...st, ...patch } : st)), done: patch.status === "done" && key === "dashboard" ? true : r.done })),
  }));
}

export async function runAutomation(runId: string, fast = false) {
  if (running.has(runId)) return;
  running.add(runId);
  const adapters = getAdapters();
  try {
    for (const key of STEP_ORDER) {
      const run = getState().runs.find((r) => r.id === runId);
      if (!run) return;
      const step = run.steps.find((x) => x.key === key)!;
      if (step.status === "done") continue;
      setStep(runId, key, { status: "running" });
      await sleep(fast ? 120 : key === "recorded" ? 650 : STEP_DELAY);
      const s0 = getState();
      const showing = s0.showings.find((x) => x.id === run.showingId);
      if (!showing) return;
      const lead = s0.leads.find((x) => x.id === showing.leadId)!;
      const listing = getListing(showing.listingId)!;
      const ctx = { showing, lead, listing };
      let detail = "";
      if (key === "recorded") detail = `Reference ${showing.ref}`;
      if (key === "email") {
        const email = await adapters.email.sendShowingNotification(ctx);
        update((s) => withActivity({ ...s, emails: [email, ...s.emails] }, act("email", `Simulated email generated for ${listing.address} (not sent)`, { leadId: lead.id, showingId: showing.id })));
        detail = email.subject;
      }
      if (key === "crm") {
        const log = await adapters.crm.upsertLeadFromShowing(ctx);
        update((s) => withActivity({ ...s, crmLogs: [log, ...s.crmLogs] }, act("crm", `Simulated CRM lead created: ${lead.firstName} ${lead.lastName}`, { leadId: lead.id, showingId: showing.id })));
        detail = "Stage: Showing Requested · Source: Website";
      }
      if (key === "calendar") {
        const evt = await adapters.calendar.createTentativeShowing(ctx);
        update((s) => withActivity({ ...s, events: [...s.events.filter((e) => e.showingId !== showing.id), evt] }, act("calendar", `Tentative calendar hold for ${formatDateTime(evt.start)} (simulated)`, { leadId: lead.id, showingId: showing.id })));
        detail = `${formatDateTime(evt.start)} · Tentative`;
      }
      if (key === "dashboard") {
        update((s) => withActivity(s, act("dashboard", `Dashboard updated with request ${showing.ref}`, { leadId: lead.id, showingId: showing.id })));
        detail = "Leads, showings and calendar refreshed";
      }
      setStep(runId, key, { status: "done", at: now(), detail });
    }
  } catch (e) {
    console.error("automation failed", e);
  } finally {
    running.delete(runId);
  }
}

/** Finish any run interrupted by a reload. */
export function resumePendingRuns() {
  getState().runs.filter((r) => !r.done).forEach((r) => runAutomation(r.id, true));
}

/* ------------------------------------------------------------------ */
/* Realtor dashboard actions                                           */
/* ------------------------------------------------------------------ */

export function updateLeadStage(leadId: string, stage: LeadStage) {
  const lead = getState().leads.find((l) => l.id === leadId);
  if (!lead || lead.stage === stage) return;
  const updated = { ...lead, stage, updatedAt: now() };
  update((s) => withActivity({ ...s, leads: s.leads.map((l) => (l.id === leadId ? updated : l)) }, act("dashboard", `${lead.firstName} ${lead.lastName} moved to ${STAGE_LABEL[stage]}`, { leadId })));
  getAdapters().crm.updateStage(updated, STAGE_LABEL[stage]).then((log) => update((s) => ({ ...s, crmLogs: [log, ...s.crmLogs] })));
}

export function addLeadNote(leadId: string, text: string) {
  const lead = getState().leads.find((l) => l.id === leadId);
  if (!lead || !text.trim()) return;
  const note = { id: uid("note-"), at: now(), text: text.trim() };
  const updated = { ...lead, notes: [note, ...lead.notes], updatedAt: now() };
  update((s) => withActivity({ ...s, leads: s.leads.map((l) => (l.id === leadId ? updated : l)) }, act("dashboard", `Note added for ${lead.firstName} ${lead.lastName}`, { leadId })));
  getAdapters().crm.addNote(updated, note.text).then((log) => update((s) => ({ ...s, crmLogs: [log, ...s.crmLogs] })));
}

const eventStatusFor = (st: ShowingStatus): CalendarEvent["status"] => (st === "requested" ? "tentative" : st === "cancelled" ? "cancelled" : "confirmed");

/** Change a showing's status and keep its calendar event and lead stage in sync. */
export function setShowingStatus(showingId: string, status: ShowingStatus, slot?: TimeSlot) {
  const s0 = getState();
  const sh = s0.showings.find((x) => x.id === showingId);
  if (!sh) return;
  const lead = s0.leads.find((l) => l.id === sh.leadId);
  const listing = getListing(sh.listingId);
  const updated: ShowingRequest = { ...sh, status, preferred: slot ?? sh.preferred, updatedAt: now() };
  const title = `${status === "requested" ? "Showing Requested" : status === "cancelled" ? "Cancelled" : "Showing"}: ${listing?.address}`;
  const nextStage: LeadStage | null = status === "confirmed" || status === "rescheduled" ? "showing_scheduled" : status === "completed" ? "follow_up" : status === "cancelled" ? "follow_up" : null;
  update((s) => {
    let next: DemoState = {
      ...s,
      showings: s.showings.map((x) => (x.id === showingId ? updated : x)),
      events: s.events.some((e) => e.showingId === showingId)
        ? s.events.map((e) => (e.showingId === showingId ? { ...e, title, status: eventStatusFor(status), start: updated.preferred.start, end: updated.preferred.end } : e))
        : [...s.events, { id: uid("evt-"), kind: "showing", title, start: updated.preferred.start, end: updated.preferred.end, status: eventStatusFor(status), listingId: sh.listingId, leadId: sh.leadId, showingId }],
    };
    if (lead && nextStage && lead.stage !== "closed") next = { ...next, leads: next.leads.map((l) => (l.id === lead.id ? { ...l, stage: nextStage, updatedAt: now() } : l)) };
    const verb = slot ? `rescheduled to ${formatDateTime(slot.start)}` : `marked ${SHOWING_STATUS[status].toLowerCase()}`;
    return withActivity(next, act("calendar", `Showing at ${listing?.address} ${verb} (demo)`, { leadId: sh.leadId, showingId }));
  });
}

export function setEventStatus(eventId: string, status: CalendarEvent["status"]) {
  const e = getState().events.find((x) => x.id === eventId);
  if (!e) return;
  if (e.showingId) return setShowingStatus(e.showingId, status === "tentative" ? "requested" : status === "cancelled" ? "cancelled" : "confirmed");
  update((s) => withActivity({ ...s, events: s.events.map((x) => (x.id === eventId ? { ...x, status } : x)) }, act("calendar", `${e.title} marked ${status} (demo)`)));
}

export function rescheduleEvent(eventId: string, slot: TimeSlot) {
  const e = getState().events.find((x) => x.id === eventId);
  if (!e) return;
  if (e.showingId) return setShowingStatus(e.showingId, "rescheduled", slot);
  const dur = new Date(e.end).getTime() - new Date(e.start).getTime();
  update((s) => withActivity({ ...s, events: s.events.map((x) => (x.id === eventId ? { ...x, start: slot.start, end: new Date(new Date(slot.start).getTime() + dur).toISOString() } : x)) }, act("calendar", `${e.title} moved to ${formatDateTime(slot.start)} (demo)`)));
}

/** Settings page: run a standalone simulation for one service. */
export async function simulateIntegration(service: "email" | "crm" | "calendar") {
  const s = getState();
  const showing = s.showings[0];
  if (!showing) return null;
  const lead = s.leads.find((l) => l.id === showing.leadId)!;
  const listing = getListing(showing.listingId)!;
  const a = getAdapters();
  await sleep(700);
  if (service === "email") {
    const email = await a.email.sendShowingNotification({ showing, lead, listing });
    update((x) => withActivity({ ...x, emails: [email, ...x.emails] }, act("email", `Test email generated from Settings (not sent)`)));
    return email.id;
  }
  if (service === "crm") {
    const log = await a.crm.upsertLeadFromShowing({ showing, lead, listing });
    update((x) => withActivity({ ...x, crmLogs: [{ ...log, operation: "test", summary: `Test sync for ${lead.firstName} ${lead.lastName} (simulated)` }, ...x.crmLogs] }, act("crm", "Test CRM sync from Settings (simulated)")));
    return log.id;
  }
  const evt = await a.calendar.createTentativeShowing({ showing, lead, listing });
  update((x) => withActivity(x, act("calendar", `Test calendar hold prepared for ${formatDateTime(evt.start)} (simulated, not saved)`)));
  return evt.id;
}

export function resetDemo() {
  const fresh = createSeed();
  running.clear();
  commit(fresh);
}
