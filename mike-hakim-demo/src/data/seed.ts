import type { Activity, AutomationRun, CalendarEvent, CrmLog, DemoState, EmailMessage, Lead, ShowingRequest, ShowingStatus } from "@/lib/types";
import { STORAGE_VERSION } from "@/config/demo";
import { addDaysYmd, detroitYmd, detroitToUtc, makeSlot } from "@/lib/time";
import { getListing, fullAddress } from "@/data/listings";
import { buildNotificationEmail } from "@/integrations/simulated/email";
import { STEP_LABELS } from "@/lib/automation-steps";

/**
 * Deterministic seed: fixed people, listings and offsets. Dates are relative to
 * the day the demo is first opened so appointments always look current.
 * All people are fictional.
 */
type P = [first: string, last: string, stage: Lead["stage"], source: Lead["source"], buyer: Lead["buyerStatus"], fin: Lead["financing"], listings: string[], daysAgo: number, note?: string];
const PEOPLE: P[] = [
  ["Nadia", "Farran", "showing_requested", "Website", "ready", "pre_approved", ["MH-24003"], 0.2, "Wants to be in before the school year starts."],
  ["Jordan", "Pierce", "showing_scheduled", "Website", "first_time", "pre_approved", ["MH-24029"], 1, "First-time buyer, working with a credit union lender."],
  ["Emily", "Kowalczyk", "new", "Instagram", "searching", "not_yet", ["MH-24017"], 0.5],
  ["Samir", "Haddadin", "showing_requested", "Website", "ready", "cash", ["MH-24011"], 1.4, "Cash buyer relocating from Chicago."],
  ["Grace", "Whitfield", "contacted", "Referral", "searching", "pre_approved", ["MH-24014", "MH-24015"], 3, "Comparing Canton and Northville."],
  ["Marcus", "Bellamy", "follow_up", "Open House", "exploring", "not_yet", ["MH-24007"], 6, "Asked about FHA options. Send lender intro."],
  ["Leila", "Mansour", "showing_scheduled", "Website", "first_time", "pre_approved", ["MH-24004"], 2],
  ["Ryan", "Okafor", "closed", "Referral", "ready", "pre_approved", ["MH-24020"], 21, "Offer accepted on a home in Westland."],
  ["Hannah", "Szymanski", "new", "Website", "exploring", "not_yet", ["MH-24012"], 0.1],
  ["Tariq", "Elamin", "showing_requested", "Website", "searching", "pre_approved", ["MH-24023"], 0.8],
  ["Olivia", "Brennan", "follow_up", "Instagram", "ready", "cash", ["MH-24027"], 9, "Wants a second look at the Birmingham modern."],
  ["Daniel", "Reyes", "contacted", "Website", "first_time", "not_yet", ["MH-24019"], 4],
];

// [personIndex, listingId, dayOffset from seed day, time, alt?, status]
type S = [number, string, number, string, [number, string] | null, ShowingStatus];
const SHOWINGS: S[] = [
  [0, "MH-24003", 2, "17:30", [3, "11:00"], "requested"],
  [1, "MH-24029", 1, "16:00", null, "confirmed"],
  [3, "MH-24011", 3, "10:30", [4, "13:00"], "requested"],
  [6, "MH-24004", 2, "12:00", null, "confirmed"],
  [9, "MH-24023", 4, "18:00", [5, "10:00"], "requested"],
  [4, "MH-24014", 5, "14:30", null, "rescheduled"],
  [5, "MH-24007", -3, "15:00", null, "completed"],
  [10, "MH-24027", -1, "11:00", null, "completed"],
];

const hoursAgo = (now: number, h: number) => new Date(now - h * 3600_000).toISOString();

export function createSeed(now = Date.now()): DemoState {
  const today = detroitYmd(now);
  const leads: Lead[] = PEOPLE.map((p, i) => {
    const created = hoursAgo(now, p[7] * 24 + i);
    return {
      id: `lead-seed-${i + 1}`,
      firstName: p[0],
      lastName: p[1],
      email: `${p[0].toLowerCase()}.${p[1].toLowerCase()}@example.com`,
      phone: `(313) 555-01${String(10 + i)}`,
      stage: p[2],
      source: p[3],
      buyerStatus: p[4],
      financing: p[5],
      listingIds: p[6],
      notes: p[8] ? [{ id: `note-seed-${i}`, at: created, text: p[8] }] : [],
      createdAt: created,
      updatedAt: created,
      sample: true,
    };
  });

  const showings: ShowingRequest[] = [];
  const events: CalendarEvent[] = [];
  const emails: EmailMessage[] = [];
  const crmLogs: CrmLog[] = [];
  const runs: AutomationRun[] = [];
  const activities: Activity[] = [];

  SHOWINGS.forEach(([pi, lid, off, time, alt, status], i) => {
    const lead = leads[pi];
    const l = getListing(lid)!;
    const preferred = makeSlot(addDaysYmd(today, off), time);
    const created = lead.createdAt;
    const s: ShowingRequest = {
      id: `show-seed-${i + 1}`,
      ref: `SR-SEED${i + 1}`,
      listingId: lid,
      leadId: lead.id,
      preferred,
      alternate: alt ? makeSlot(addDaysYmd(today, alt[0]), alt[1]) : undefined,
      status,
      notes: i === 0 ? "Could we also look at the basement? Bringing my parents." : "",
      document: lead.financing === "pre_approved" ? { name: `sample-preapproval-${lead.lastName.toLowerCase()}.pdf`, type: "PDF", size: 184_000 + i * 9_100 } : null,
      createdAt: created,
      updatedAt: created,
      sample: true,
    };
    showings.push(s);
    events.push({
      id: `evt-seed-${i + 1}`,
      kind: "showing",
      title: `${status === "requested" ? "Showing Requested" : "Showing"}: ${l.address}`,
      start: preferred.start,
      end: preferred.end,
      status: status === "confirmed" || status === "completed" || status === "rescheduled" ? "confirmed" : status === "cancelled" ? "cancelled" : "tentative",
      listingId: lid,
      leadId: lead.id,
      showingId: s.id,
    });
    if (lead.source === "Website" || i < 6) {
      const email = buildNotificationEmail({ showing: s, lead, listing: l, id: `mail-seed-${i + 1}`, at: created });
      emails.push(email);
      crmLogs.push({ id: `crm-seed-${i + 1}`, at: created, leadId: lead.id, operation: "create_lead", summary: `Lead ${lead.firstName} ${lead.lastName} created from website showing request`, payload: { source: "Website", property: fullAddress(l), stage: "Showing Requested" }, result: "simulated" });
      runs.push({
        id: `run-seed-${i + 1}`,
        showingId: s.id,
        createdAt: created,
        done: true,
        steps: (Object.keys(STEP_LABELS) as (keyof typeof STEP_LABELS)[]).map((key, k) => ({ key, label: STEP_LABELS[key], status: "done", at: new Date(new Date(created).getTime() + k * 1200).toISOString() })),
      });
    }
    activities.push({ id: `act-seed-s${i + 1}`, at: created, system: "website", message: `${lead.firstName} ${lead.lastName} requested a showing at ${l.address}`, leadId: lead.id, showingId: s.id });
    if (status === "confirmed") activities.push({ id: `act-seed-c${i + 1}`, at: hoursAgo(now, 2 + i), system: "dashboard", message: `Showing confirmed for ${lead.firstName} ${lead.lastName} at ${l.address}`, leadId: lead.id, showingId: s.id });
  });

  // open houses and a lender call so the calendar has more than showings
  const extra: [string, string, number, string, string, string?][] = [
    ["evt-seed-oh1", "Open House: 4182 Larkmoor Ct", 5, "12:00", "14:00", "MH-24001"],
    ["evt-seed-oh2", "Open House: 411 Linden Hollow", 6, "13:00", "15:00", "MH-24021"],
    ["evt-seed-ap1", "Listing consult: Dearborn Heights seller", 1, "10:00", "11:00"],
  ];
  extra.forEach(([id, title, off, s, e, lid]) => {
    const d = addDaysYmd(today, off);
    events.push({ id, kind: lid ? "open_house" : "appointment", title, start: detroitToUtc(d, s).toISOString(), end: detroitToUtc(d, e).toISOString(), status: "confirmed", listingId: lid });
  });

  leads.forEach((l, i) => {
    if (!showings.some((s) => s.leadId === l.id))
      activities.push({ id: `act-seed-l${i + 1}`, at: l.createdAt, system: "website", message: `New ${l.source.toLowerCase()} lead: ${l.firstName} ${l.lastName}`, leadId: l.id });
    crmLogs.push({ id: `crm-seed-st${i + 1}`, at: l.updatedAt, leadId: l.id, operation: "update_stage", summary: `Stage set to ${l.stage.replace(/_/g, " ")}`, payload: { stage: l.stage }, result: "simulated" });
  });

  activities.sort((a, b) => b.at.localeCompare(a.at));
  return {
    version: STORAGE_VERSION,
    seededAt: new Date(now).toISOString(),
    leads,
    showings,
    events,
    activities,
    emails,
    crmLogs: crmLogs.sort((a, b) => b.at.localeCompare(a.at)),
    runs,
    favorites: ["MH-24001", "MH-24021"],
    compare: [],
  };
}
